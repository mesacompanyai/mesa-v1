import { Prisma, PrismaClient } from "@prisma/client";
import { Queue, Worker } from "bullmq";
import OpenAI from "openai";
import {
  DEFAULT_JOB_OPTIONS,
  detectMediaKind,
  EvolutionWebhookJob,
  EvolutionWebhookPayload,
  extractEvolutionMessageId,
  extractMessageText,
  extractMessageType,
  extractRemoteJid,
  isFromMe,
  parseEvolutionTimestamp,
  QUEUE_NAMES,
} from "../../../packages/shared/src";
import { createRedisConnection } from "../../../packages/shared/src/redis";

const prisma = new PrismaClient();
const connection = createRedisConnection();
const mediaQueue = new Queue(QUEUE_NAMES.mediaProcessing, {
  connection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

type MediaInfo = {
  mediaKind: "image" | "audio" | "video" | "document" | "sticker" | "unknown";
  mimeType?: string;
  fileName?: string;
  fileLength?: bigint;
  sourceUrl?: string;
};

const worker = new Worker<EvolutionWebhookJob>(
  QUEUE_NAMES.evolutionEvents,
  async (job) => {
    const event = await prisma.messageEvent.findUnique({
      where: { id: job.data.messageEventId },
      include: {
        whatsappInstance: true,
        tenant: true,
      },
    });

    if (!event || !event.tenantId || !event.whatsappInstanceId || !event.whatsappInstance) {
      return;
    }

    const payload = event.payload as EvolutionWebhookPayload;

    try {
      if (event.event === "CONNECTION_UPDATE") {
        await processConnectionUpdate(event.whatsappInstance.id, payload);
      }

      if (event.event !== "MESSAGES_UPSERT") {
        await markEvent(event.id, "processed");
        return;
      }

      const remoteJid = extractRemoteJid(payload);
      if (!remoteJid) {
        await markEvent(event.id, "ignored", "Missing remoteJid");
        return;
      }

      const messageText = extractMessageText(payload);
      const messageType = extractMessageType(payload);
      const externalMessageId = extractEvolutionMessageId(payload);
      const timestamp = parseEvolutionTimestamp(payload);
      const customer = await upsertCustomer(event.tenantId, payload, remoteJid);
      const conversation = await upsertConversation({
        tenantId: event.tenantId,
        whatsappInstanceId: event.whatsappInstanceId,
        customerId: customer.id,
        remoteJid,
        preview: messageText,
        timestamp,
        fromMe: isFromMe(payload),
      });

      const message = externalMessageId
        ? await prisma.message.upsert({
            where: {
              tenantId_conversationId_externalMessageId: {
                tenantId: event.tenantId,
                conversationId: conversation.id,
                externalMessageId,
              },
            },
            update: {
              text: messageText,
              raw: payload as Prisma.InputJsonValue,
              updatedAt: new Date(),
            },
            create: {
              tenantId: event.tenantId,
              conversationId: conversation.id,
              externalMessageId,
              senderRole: isFromMe(payload) ? "ai" : "customer",
              fromMe: isFromMe(payload),
              messageType,
              text: messageText,
              timestamp,
              raw: payload as Prisma.InputJsonValue,
            },
          })
        : await prisma.message.create({
            data: {
              tenantId: event.tenantId,
              conversationId: conversation.id,
              senderRole: isFromMe(payload) ? "ai" : "customer",
              fromMe: isFromMe(payload),
              messageType,
              text: messageText,
              timestamp,
              raw: payload as Prisma.InputJsonValue,
            },
          });

      const mediaInfo = extractMediaInfo(payload, messageType);
      if (mediaInfo.mediaKind !== "unknown") {
        await createMediaAssetAndJob({
          tenantId: event.tenantId,
          conversationId: conversation.id,
          messageId: message.id,
          payload,
          mediaInfo,
        });
      }

      if (messageText && !isFromMe(payload)) {
        await createAiDraftAndReview({
          tenantId: event.tenantId,
          conversationId: conversation.id,
          messageId: message.id,
          customerName: customer.name || undefined,
          text: messageText,
        });
      }

      await markEvent(event.id, "processed");
    } catch (error) {
      await markEvent(event.id, "failed", error instanceof Error ? error.message : String(error));
      throw error;
    }
  },
  { connection, concurrency: Number(process.env.MESSAGE_WORKER_CONCURRENCY || 5) },
);

worker.on("completed", (job) => {
  console.log(`[worker-messages] completed ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`[worker-messages] failed ${job?.id}:`, error);
});

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

async function shutdown() {
  await worker.close();
  await mediaQueue.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
}

async function markEvent(id: string, status: "processed" | "ignored" | "failed", errorMessage?: string) {
  await prisma.messageEvent.update({
    where: { id },
    data: {
      status,
      errorMessage,
      processedAt: status === "processed" || status === "ignored" ? new Date() : undefined,
    },
  });
}

async function processConnectionUpdate(whatsappInstanceId: string, payload: EvolutionWebhookPayload) {
  const state = readConnectionState(payload);

  if (!state) return;

  await prisma.whatsappInstance.update({
    where: { id: whatsappInstanceId },
    data: {
      status: state === "open" ? "open" : state === "close" ? "close" : "connecting",
      lastConnectedAt: state === "open" ? new Date() : undefined,
      lastDisconnectedAt: state === "close" ? new Date() : undefined,
    },
  });
}

function readConnectionState(payload: EvolutionWebhookPayload): string | null {
  const data = payload.data as Record<string, unknown> | undefined;
  const state = data?.state || data?.status || data?.connection;
  return typeof state === "string" ? state : null;
}

async function upsertCustomer(tenantId: string, payload: EvolutionWebhookPayload, remoteJid: string) {
  const data = payload.data as Record<string, unknown> | undefined;
  const pushName = typeof data?.pushName === "string" ? data.pushName : undefined;
  const phoneE164 = jidToPhone(remoteJid);

  return prisma.customer.upsert({
    where: {
      tenantId_phoneE164: {
        tenantId,
        phoneE164,
      },
    },
    update: {
      name: pushName,
      initials: pushName ? initials(pushName) : undefined,
      lastContactAt: new Date(),
    },
    create: {
      tenantId,
      phoneE164,
      name: pushName,
      initials: pushName ? initials(pushName) : undefined,
      lastContactAt: new Date(),
    },
  });
}

async function upsertConversation(input: {
  tenantId: string;
  whatsappInstanceId: string;
  customerId: string;
  remoteJid: string;
  preview: string | null;
  timestamp: Date;
  fromMe: boolean;
}) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: { retentionDays: true },
  });
  const retentionDays = tenant?.retentionDays || 30;
  const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

  return prisma.conversation.upsert({
    where: {
      tenantId_whatsappInstanceId_remoteJid: {
        tenantId: input.tenantId,
        whatsappInstanceId: input.whatsappInstanceId,
        remoteJid: input.remoteJid,
      },
    },
    update: {
      customerId: input.customerId,
      lastMessagePreview: input.preview,
      lastMessageAt: input.timestamp,
      expiresAt,
      unreadCount: input.fromMe ? undefined : { increment: 1 },
    },
    create: {
      tenantId: input.tenantId,
      whatsappInstanceId: input.whatsappInstanceId,
      customerId: input.customerId,
      remoteJid: input.remoteJid,
      title: input.preview?.slice(0, 80),
      status: "active",
      lastMessagePreview: input.preview,
      lastMessageAt: input.timestamp,
      expiresAt,
      unreadCount: input.fromMe ? 0 : 1,
    },
  });
}

function extractMediaInfo(payload: EvolutionWebhookPayload, messageType: string): MediaInfo {
  const data = payload.data as Record<string, unknown> | undefined;
  const message = data?.message as Record<string, unknown> | undefined;
  const mediaMessage = message?.[messageType] as Record<string, unknown> | undefined;
  const mimeType = typeof mediaMessage?.mimetype === "string" ? mediaMessage.mimetype : undefined;
  const mediaKind = detectMediaKind(messageType, mimeType);
  const fileLength = mediaMessage?.fileLength;

  return {
    mediaKind,
    mimeType,
    fileName: typeof mediaMessage?.fileName === "string" ? mediaMessage.fileName : undefined,
    sourceUrl:
      typeof mediaMessage?.url === "string"
        ? mediaMessage.url
        : typeof data?.mediaUrl === "string"
          ? data.mediaUrl
          : undefined,
    fileLength:
      typeof fileLength === "number"
        ? BigInt(fileLength)
        : typeof fileLength === "string" && /^\d+$/.test(fileLength)
          ? BigInt(fileLength)
          : undefined,
  };
}

async function createMediaAssetAndJob(input: {
  tenantId: string;
  conversationId: string;
  messageId: string;
  payload: EvolutionWebhookPayload;
  mediaInfo: MediaInfo;
}) {
  const storageKey = ["tenants", input.tenantId, "pending", input.messageId, input.mediaInfo.fileName || "media"].join("/");
  const asset = await prisma.mediaAsset.upsert({
    where: { storageKey },
    update: {
      raw: input.payload as Prisma.InputJsonValue,
    },
    create: {
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      messageId: input.messageId,
      bucket: process.env.R2_BUCKET || "mesa-media",
      storageKey,
      originalFileName: input.mediaInfo.fileName,
      mimeType: input.mediaInfo.mimeType,
      mediaType: input.mediaInfo.mediaKind,
      sizeBytes: input.mediaInfo.fileLength,
      sourceUrl: input.mediaInfo.sourceUrl,
      raw: input.payload as Prisma.InputJsonValue,
    },
  });

  const processingJob = await prisma.mediaProcessingJob.create({
    data: {
      tenantId: input.tenantId,
      mediaAssetId: asset.id,
      kind: input.mediaInfo.mediaKind,
      status: "pending",
    },
  });

  const queued = await mediaQueue.add(
    "process-media",
    {
      tenantId: input.tenantId,
      mediaAssetId: asset.id,
      messageId: input.messageId,
      conversationId: input.conversationId,
    },
    { jobId: asset.id },
  );

  await prisma.mediaProcessingJob.update({
    where: { id: processingJob.id },
    data: { queueJobId: queued.id, status: "pending" },
  });
}

async function createAiDraftAndReview(input: {
  tenantId: string;
  conversationId: string;
  messageId: string;
  customerName?: string;
  text: string;
}) {
  const analysis = await analyzeText(input.text, input.customerName);

  await prisma.aiDraft.create({
    data: {
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      messageId: input.messageId,
      intent: analysis.intent,
      text: analysis.replyDraft,
      model: process.env.OPENAI_TEXT_MODEL || null,
      confidence: analysis.confidence,
      metadata: analysis as Prisma.InputJsonValue,
    },
  });

  const memories = analysis.memories
    .filter((memory) => memory.scope === "lifetime")
    .map((memory) => ({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      category: memory.category,
      label: memory.label,
      value: memory.value,
      confidence: memory.confidence,
    }));

  if (memories.length) {
    await prisma.memory.createMany({ data: memories });
  }

  const reservationFacts = [
    ...analysis.memories
      .filter((memory) => memory.scope === "reservation")
      .map((memory) => ({
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        category: memory.category,
        label: memory.label,
        value: memory.value as Prisma.InputJsonValue,
        confidence: memory.confidence,
      })),
    ...analysis.reservationFacts.map((fact) => ({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      category: fact.category,
      label: fact.label,
      value: fact.value as Prisma.InputJsonValue,
      confidence: fact.confidence,
    })),
  ];

  if (reservationFacts.length) {
    await prisma.reservationFact.createMany({ data: reservationFacts });
  }

  if (analysis.requiresHumanReview) {
    await prisma.conversation.update({
      where: { id: input.conversationId },
      data: { status: "requires_human_review" },
    });
    await prisma.humanReview.create({
      data: {
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        reason: "ai_pilot_review",
        details: analysis as Prisma.InputJsonValue,
      },
    });
  }
}

async function analyzeText(text: string, customerName?: string) {
  if (!openai) {
    return fallbackAnalysis(text);
  }

  const response = await openai.responses.create({
    model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content:
          "You are Mesa, a pilot-mode restaurant reservation assistant. Return strict JSON with intent, replyDraft, requiresHumanReview, confidence, memories and reservationFacts.",
      },
      {
        role: "user",
        content: JSON.stringify({ customerName, text }),
      },
    ],
  });

  try {
    return JSON.parse((response as { output_text?: string }).output_text || "{}") as ReturnType<typeof fallbackAnalysis>;
  } catch {
    return fallbackAnalysis(text);
  }
}

function fallbackAnalysis(text: string) {
  return {
    intent: "needs_review",
    replyDraft: "Recebemos sua mensagem. A equipe vai revisar e responder em seguida.",
    requiresHumanReview: true,
    confidence: 0.3,
    memories: [] as Array<{
      scope: "lifetime" | "reservation";
      category: string;
      label: string;
      value?: string;
      confidence?: number;
    }>,
    reservationFacts: [
      {
        category: "observacao",
        label: text.slice(0, 120),
        value: text,
        confidence: 0.3,
      },
    ],
  };
}

function jidToPhone(remoteJid: string): string {
  const phone = remoteJid.split("@")[0]?.replace(/\D/g, "") || remoteJid;
  return phone.startsWith("+") ? phone : `+${phone}`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
