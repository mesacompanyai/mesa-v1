import { createHash } from "node:crypto";
import { extname } from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PrismaClient } from "@prisma/client";
import { Worker } from "bullmq";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import sharp from "sharp";
import {
  MediaProcessingJob,
  OPENAI_DEFAULT_TRANSCRIPTION_MODEL,
  OPENAI_DEFAULT_VISION_MODEL,
  QUEUE_NAMES,
} from "../../../packages/shared/src";
import { createRedisConnection } from "../../../packages/shared/src/redis";

const prisma = new PrismaClient();
const connection = createRedisConnection();
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const worker = new Worker<MediaProcessingJob>(
  QUEUE_NAMES.mediaProcessing,
  async (job) => {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: job.data.mediaAssetId },
      include: {
        conversation: {
          include: {
            whatsappInstance: true,
          },
        },
      },
    });

    if (!asset) return;

    const processingJob = await prisma.mediaProcessingJob.findFirst({
      where: { mediaAssetId: asset.id, status: { in: ["pending", "processing"] } },
      orderBy: { createdAt: "desc" },
    });

    await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { processingStatus: "processing" },
    });

    if (processingJob) {
      await prisma.mediaProcessingJob.update({
        where: { id: processingJob.id },
        data: {
          status: "processing",
          attempts: { increment: 1 },
          startedAt: new Date(),
        },
      });
    }

    try {
      const downloaded = await downloadMedia(asset);
      if (!downloaded) {
        await complete(asset.id, processingJob?.id, "skipped", "No media bytes available");
        return;
      }

      const { fileTypeFromBuffer } = await import("file-type");
      const detected = await fileTypeFromBuffer(downloaded.buffer);
      const mimeType = downloaded.mimeType || detected?.mime || asset.mimeType || "application/octet-stream";
      const extension = extensionFor(downloaded.fileName, detected?.ext, mimeType);
      const storageKey = [
        "tenants",
        asset.tenantId,
        "media",
        asset.id.slice(0, 2),
        `${asset.id}.${extension}`,
      ].join("/");
      const checksumSha256 = createHash("sha256").update(downloaded.buffer).digest("hex");

      await putObject(storageKey, downloaded.buffer, mimeType);

      let thumbnailStorageKey: string | undefined;
      if (asset.mediaType === "image") {
        thumbnailStorageKey = await createImageThumbnail(asset.tenantId, asset.id, downloaded.buffer);
        await analyzeImage(asset.id, storageKey);
      }

      if (asset.mediaType === "audio") {
        await transcribeAudio(asset.id, downloaded.buffer, downloaded.fileName || `${asset.id}.${extension}`, mimeType);
      }

      if (asset.mediaType === "document" && mimeType === "application/pdf") {
        await extractPdfText(asset.id, downloaded.buffer);
      }

      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: {
          storageKey,
          mimeType,
          originalFileName: downloaded.fileName || asset.originalFileName,
          sizeBytes: BigInt(downloaded.buffer.length),
          checksumSha256,
          thumbnailStorageKey,
          processingStatus: "completed",
          processingError: null,
        },
      });

      await complete(asset.id, processingJob?.id, "completed");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await complete(asset.id, processingJob?.id, "failed", message);
      throw error;
    }
  },
  { connection, concurrency: Number(process.env.MEDIA_WORKER_CONCURRENCY || 3) },
);

worker.on("completed", (job) => {
  console.log(`[worker-media] completed ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`[worker-media] failed ${job?.id}:`, error);
});

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

async function shutdown() {
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
}

async function downloadMedia(asset: any) {
  if (!asset) return null;

  if (asset.sourceUrl) {
    const response = await fetch(asset.sourceUrl);
    if (!response.ok) throw new Error(`Failed to download media URL: ${response.status}`);
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      mimeType: response.headers.get("content-type") || asset.mimeType || undefined,
      fileName: asset.originalFileName || undefined,
    };
  }

  const raw = asset.raw as Record<string, unknown> | null;
  const base64 = typeof raw?.base64 === "string" ? raw.base64 : undefined;
  if (base64) {
    return {
      buffer: Buffer.from(base64, "base64"),
      mimeType: asset.mimeType || undefined,
      fileName: asset.originalFileName || undefined,
    };
  }

  const instance = asset.conversation?.whatsappInstance;
  if (!instance) return null;

  const evolutionBaseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = instance.instanceHash || process.env.EVOLUTION_GLOBAL_API_KEY;
  if (!evolutionBaseUrl || !apiKey) return null;

  const response = await fetch(
    `${evolutionBaseUrl.replace(/\/$/, "")}/chat/getBase64FromMediaMessage/${encodeURIComponent(instance.instanceName)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        message: raw,
        convertToMp4: asset.mediaType === "audio",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Evolution media download failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    base64?: string;
    mimetype?: string;
    fileName?: string;
  };

  if (!payload.base64) return null;

  return {
    buffer: Buffer.from(payload.base64, "base64"),
    mimeType: payload.mimetype || asset.mimeType || undefined,
    fileName: payload.fileName || asset.originalFileName || undefined,
  };
}

async function createImageThumbnail(tenantId: string, mediaAssetId: string, buffer: Buffer): Promise<string> {
  const thumbnail = await sharp(buffer).rotate().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const key = ["tenants", tenantId, "media", "thumbs", `${mediaAssetId}.webp`].join("/");
  await putObject(key, thumbnail, "image/webp");
  return key;
}

async function analyzeImage(mediaAssetId: string, storageKey: string) {
  if (!openai) return;

  const signedUrl = await getReadUrl(storageKey);
  const response = await openai.responses.create({
    model: process.env.OPENAI_VISION_MODEL || OPENAI_DEFAULT_VISION_MODEL,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Analyze this WhatsApp image for restaurant reservation context. Return a concise Portuguese summary.",
          },
          {
            type: "input_image",
            image_url: signedUrl,
          },
        ],
      },
    ] as never,
  });

  const summary = (response as { output_text?: string }).output_text;
  if (!summary) return;

  const asset = await prisma.mediaAsset.findUnique({ where: { id: mediaAssetId }, select: { tenantId: true, conversationId: true } });
  if (!asset?.conversationId) return;

  await prisma.reservationFact.create({
    data: {
      tenantId: asset.tenantId,
      conversationId: asset.conversationId,
      category: "imagem",
      label: "Resumo da imagem",
      value: summary,
      confidence: 0.75,
    },
  });
}

async function transcribeAudio(mediaAssetId: string, buffer: Buffer, fileName: string, mimeType: string) {
  if (!openai) return;

  const model = process.env.OPENAI_TRANSCRIPTION_MODEL || OPENAI_DEFAULT_TRANSCRIPTION_MODEL;
  const transcription = await openai.audio.transcriptions.create({
    file: await toFile(buffer, fileName, { type: mimeType }),
    model,
  });
  const text = (transcription as { text?: string }).text || "";
  const asset = await prisma.mediaAsset.findUnique({ where: { id: mediaAssetId }, select: { tenantId: true } });
  if (!asset || !text) return;

  await prisma.transcript.upsert({
    where: { mediaAssetId },
    update: {
      text,
      model,
    },
    create: {
      tenantId: asset.tenantId,
      mediaAssetId,
      text,
      model,
    },
  });
}

async function extractPdfText(mediaAssetId: string, buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  const asset = await prisma.mediaAsset.findUnique({ where: { id: mediaAssetId }, select: { tenantId: true } });
  if (!asset || !result.text?.trim()) return;

  await prisma.transcript.upsert({
    where: { mediaAssetId },
    update: {
      text: result.text,
      model: "pdf-parse",
    },
    create: {
      tenantId: asset.tenantId,
      mediaAssetId,
      text: result.text,
      model: "pdf-parse",
    },
  });
}

async function complete(mediaAssetId: string, processingJobId: string | undefined, status: "completed" | "failed" | "skipped", errorMessage?: string) {
  await prisma.mediaAsset.update({
    where: { id: mediaAssetId },
    data: {
      processingStatus: status,
      processingError: errorMessage,
    },
  });

  if (processingJobId) {
    await prisma.mediaProcessingJob.update({
      where: { id: processingJobId },
      data: {
        status,
        errorMessage,
        completedAt: new Date(),
      },
    });
  }
}

async function putObject(key: string, body: Buffer, contentType: string) {
  const client = createR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: requiredEnv("R2_BUCKET"),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

async function getReadUrl(key: string) {
  return getSignedUrl(
    createR2Client(),
    new GetObjectCommand({
      Bucket: requiredEnv("R2_BUCKET"),
      Key: key,
    }),
    { expiresIn: 900 },
  );
}

function createR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${requiredEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function extensionFor(fileName?: string | null, detectedExt?: string, mimeType?: string): string {
  const existing = fileName ? extname(fileName).replace(".", "") : "";
  if (existing) return existing;
  if (detectedExt) return detectedExt;
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType?.startsWith("audio/")) return mimeType.split("/")[1] || "audio";
  if (mimeType?.startsWith("image/")) return mimeType.split("/")[1] || "image";
  return "bin";
}
