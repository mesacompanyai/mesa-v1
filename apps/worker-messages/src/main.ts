import { Prisma, PrismaClient } from "@prisma/client";
import { Queue, Worker } from "bullmq";
import OpenAI from "openai";
import {
  CONVERSATION_ANALYSIS_JSON_SCHEMA,
  ConversationAnalysis,
  ConversationAnalysisSchema,
  DEFAULT_JOB_OPTIONS,
  detectMediaKind,
  EvolutionWebhookJob,
  EvolutionWebhookPayload,
  extractEvolutionMessageId,
  extractMessageText,
  extractMessageType,
  extractRemoteJid,
  fallbackConversationAnalysis,
  hasRequiredReservationFields,
  isFromMe,
  OPENAI_DEFAULT_TEXT_MODEL,
  parseEvolutionTimestamp,
  parseReservationStartsAt,
  parseRestaurantAiGuide,
  parseRestaurantSettings,
  QUEUE_NAMES,
  selectSmallestAvailableTable,
  shouldAutoSendAnalysis,
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
          customerId: customer.id,
          customerName: customer.name || undefined,
          remoteJid,
          whatsappInstance: event.whatsappInstance,
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
  customerId: string;
  customerName?: string;
  remoteJid: string;
  whatsappInstance: {
    instanceName: string;
    instanceHash: string | null;
  };
  text: string;
}) {
  const existingSentDraft = await prisma.aiDraft.findFirst({
    where: { messageId: input.messageId, status: "sent" },
    select: { id: true },
  });
  if (existingSentDraft) return;

  const context = await getRestaurantContext(input.tenantId);
  const analysis = await analyzeText(input.text, input.customerName, context);

  const draft = await prisma.aiDraft.create({
    data: {
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      messageId: input.messageId,
      intent: analysis.intent,
      text: analysis.replyDraft,
      model: process.env.OPENAI_TEXT_MODEL || OPENAI_DEFAULT_TEXT_MODEL,
      confidence: analysis.confidence,
      metadata: analysis as Prisma.InputJsonValue,
    },
  });

  await persistAiMemoryAndFacts({
    tenantId: input.tenantId,
    customerId: input.customerId,
    conversationId: input.conversationId,
    analysis,
  });

  const shouldSend = shouldAutoSendAnalysis(analysis);
  const wantsReservationConfirmation =
    shouldSend &&
    (analysis.reservation.status === "ready_to_confirm" || analysis.reservation.status === "confirmed") &&
    hasRequiredReservationFields(analysis.reservation);

  if (wantsReservationConfirmation) {
    const reservationResult = await confirmReservationFromAnalysis({
      tenantId: input.tenantId,
      customerId: input.customerId,
      conversationId: input.conversationId,
      analysis,
      context,
    });

    if (!reservationResult.confirmed) {
      await requireHumanReview(input, analysis, reservationResult.reason);
      return;
    }
  } else if (analysis.requiresHumanReview || !shouldSend) {
    await requireHumanReview(input, analysis, analysis.reviewReason || "outside_auto_send_policy");
    return;
  }

  try {
    await sendAiReply({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      draftId: draft.id,
      remoteJid: input.remoteJid,
      whatsappInstance: input.whatsappInstance,
      text: analysis.replyDraft,
      model: process.env.OPENAI_TEXT_MODEL || OPENAI_DEFAULT_TEXT_MODEL,
    });
  } catch (error) {
    await requireHumanReview(
      input,
      analysis,
      `auto_send_failed:${error instanceof Error ? error.message : String(error)}`.slice(0, 180),
    );
  }
}

async function persistAiMemoryAndFacts(input: {
  tenantId: string;
  customerId: string;
  conversationId: string;
  analysis: ConversationAnalysis;
}) {
  const memories = input.analysis.memories
    .filter((memory) => memory.scope === "lifetime")
    .map((memory) => ({
      tenantId: input.tenantId,
      customerId: input.customerId,
      conversationId: input.conversationId,
      category: memory.category,
      label: memory.label,
      value: memory.value || undefined,
      confidence: memory.confidence || undefined,
    }));

  if (memories.length) {
    await prisma.memory.createMany({ data: memories });
  }

  const reservationFacts = [
    ...input.analysis.memories
      .filter((memory) => memory.scope === "reservation")
      .map((memory) => ({
        tenantId: input.tenantId,
        customerId: input.customerId,
        conversationId: input.conversationId,
        category: memory.category,
        label: memory.label,
        value: memory.value as Prisma.InputJsonValue,
        confidence: memory.confidence || undefined,
      })),
    ...input.analysis.reservationFacts.map((fact) => ({
      tenantId: input.tenantId,
      customerId: input.customerId,
      conversationId: input.conversationId,
      category: fact.category,
      label: fact.label,
      value: fact.value as Prisma.InputJsonValue,
      confidence: fact.confidence || undefined,
    })),
  ];

  if (reservationFacts.length) {
    await prisma.reservationFact.createMany({ data: reservationFacts });
  }
}

async function requireHumanReview(
  input: {
    tenantId: string;
    conversationId: string;
    messageId: string;
  },
  analysis: ConversationAnalysis,
  reason: string,
) {
  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { status: "requires_human_review" },
  });
  await prisma.humanReview.create({
    data: {
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      messageId: input.messageId,
      reason,
      details: analysis as Prisma.InputJsonValue,
    },
  });
}

async function analyzeText(text: string, customerName: string | undefined, context: RestaurantContext): Promise<ConversationAnalysis> {
  if (!openai) {
    return fallbackConversationAnalysis(text, "openai_not_configured");
  }

  try {
    const response = await openai.responses.create({
      model: process.env.OPENAI_TEXT_MODEL || OPENAI_DEFAULT_TEXT_MODEL,
      text: {
        format: {
          type: "json_schema",
          name: "mesa_conversation_analysis",
          strict: true,
          schema: CONVERSATION_ANALYSIS_JSON_SCHEMA,
        },
      },
      input: [
        {
          role: "system",
          content: buildSystemPrompt(context),
        },
        {
          role: "user",
          content: JSON.stringify({
            customerName,
            currentDate: new Date().toISOString().slice(0, 10),
            timezone: context.restaurant.timezone,
            message: text,
          }),
        },
      ],
    });

    return ConversationAnalysisSchema.parse(JSON.parse((response as { output_text?: string }).output_text || "{}"));
  } catch {
    return fallbackConversationAnalysis(text, "invalid_openai_output");
  }
}

type RestaurantContext = Awaited<ReturnType<typeof getRestaurantContext>>;

async function getRestaurantContext(tenantId: string) {
  const restaurant =
    (await prisma.restaurant.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    })) ||
    (await prisma.restaurant.create({
      data: {
        tenantId,
        name: "Restaurante",
        timezone: "America/Sao_Paulo",
      },
    }));

  const [tables, blockingReservations, team] = await Promise.all([
    prisma.diningTable.findMany({
      where: { tenantId, restaurantId: restaurant.id, active: true },
      orderBy: [{ seats: "asc" }, { number: "asc" }],
    }),
    prisma.reservation.findMany({
      where: {
        tenantId,
        tableId: { not: null },
        status: { in: ["confirmed", "seated"] },
      },
      select: { tableId: true, status: true },
    }),
    prisma.teamMember.findMany({
      where: { tenantId, restaurantId: restaurant.id, activeToday: true },
      orderBy: [{ name: "asc" }],
    }),
  ]);

  return {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      style: restaurant.style,
      description: restaurant.description,
      timezone: restaurant.timezone,
      businessHours: restaurant.businessHours,
      aiGuide: parseRestaurantAiGuide(restaurant.aiGuide),
      settings: parseRestaurantSettings(restaurant.settings),
    },
    tables,
    blockingReservations,
    team,
  };
}

function buildSystemPrompt(context: RestaurantContext): string {
  const enabledTopics = context.restaurant.aiGuide.topics.filter((topic) => topic.enabled);
  return [
    "You are Mesa, a Portuguese-speaking WhatsApp assistant for a restaurant.",
    "Only allow automatic replies for messages covered by the enabled Guia de Atendimento topics.",
    "If the message is outside the guide, risky, unclear, about payment/conflict/complaint, or has low confidence, set requiresHumanReview=true, canAutoSend=false, withinGuide=false.",
    "When collecting reservations, require customerName, date, time, and partySize before marking reservation.status as ready_to_confirm or confirmed.",
    "Use YYYY-MM-DD for date and HH:mm for time in the restaurant timezone.",
    "Do not promise table availability yourself; the backend will confirm availability after your structured output.",
    JSON.stringify({
      restaurant: context.restaurant,
      enabledGuideTopics: enabledTopics,
      availableTables: context.tables.map((table) => ({
        number: table.number,
        label: table.label,
        location: table.location,
        seats: table.seats,
      })),
      activeTeam: context.team.map((member) => ({ name: member.name, phone: member.phoneE164 })),
    }),
  ].join("\n");
}

async function confirmReservationFromAnalysis(input: {
  tenantId: string;
  customerId: string;
  conversationId: string;
  analysis: ConversationAnalysis;
  context: RestaurantContext;
}): Promise<{ confirmed: true } | { confirmed: false; reason: string }> {
  const reservation = input.analysis.reservation;
  if (!reservation.date || !reservation.time || !reservation.partySize || !reservation.customerName) {
    return { confirmed: false, reason: "missing_required_reservation_fields" };
  }

  const table = selectSmallestAvailableTable(
    input.context.tables,
    input.context.blockingReservations,
    reservation.partySize,
    reservation.areaPreference,
  );
  if (!table) return { confirmed: false, reason: "no_available_table" };

  const startsAt = parseReservationStartsAt(reservation.date, reservation.time);
  if (Number.isNaN(startsAt.getTime())) {
    return { confirmed: false, reason: "invalid_reservation_datetime" };
  }

  await prisma.customer.update({
    where: { id: input.customerId },
    data: { name: reservation.customerName },
  });

  const existing = await prisma.reservation.findFirst({
    where: {
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      status: { in: ["draft", "waiting", "confirmed", "seated"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = {
    restaurantId: input.context.restaurant.id,
    customerId: input.customerId,
    status: "confirmed" as const,
    startsAt,
    partySize: reservation.partySize,
    tableId: table.id,
    tableLabel: table.label || `Mesa ${table.number}`,
    area: table.location || reservation.areaPreference,
    notes: reservation.notes || undefined,
    raw: input.analysis as Prisma.InputJsonValue,
  };

  const savedReservation = existing
    ? await prisma.reservation.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.reservation.create({
        data: {
          tenantId: input.tenantId,
          conversationId: input.conversationId,
          source: "whatsapp_ai",
          ...data,
        },
      });

  await prisma.reservationFact.updateMany({
    where: { tenantId: input.tenantId, conversationId: input.conversationId, reservationId: null },
    data: { reservationId: savedReservation.id },
  });

  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { status: "confirmed" },
  });

  return { confirmed: true };
}

async function sendAiReply(input: {
  tenantId: string;
  conversationId: string;
  draftId: string;
  remoteJid: string;
  whatsappInstance: {
    instanceName: string;
    instanceHash: string | null;
  };
  text: string;
  model: string;
}) {
  const result = await sendEvolutionText({
    instanceName: input.whatsappInstance.instanceName,
    instanceApiKey: input.whatsappInstance.instanceHash || process.env.EVOLUTION_GLOBAL_API_KEY,
    remoteJid: input.remoteJid,
    text: input.text,
  });
  const externalMessageId = extractSentMessageId(result);

  await prisma.message.create({
    data: {
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      externalMessageId,
      senderRole: "ai",
      fromMe: true,
      messageType: "conversation",
      text: input.text,
      timestamp: new Date(),
      status: "sent",
      raw: {
        source: "openai_auto_send",
        model: input.model,
        evolution: result,
      } as Prisma.InputJsonValue,
    },
  });
  await prisma.aiDraft.update({
    where: { id: input.draftId },
    data: { status: "sent" },
  });
  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: {
      lastMessagePreview: input.text,
      lastMessageAt: new Date(),
      unreadCount: 0,
    },
  });
}

async function sendEvolutionText(input: {
  instanceName: string;
  instanceApiKey?: string;
  remoteJid: string;
  text: string;
}) {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = input.instanceApiKey || process.env.EVOLUTION_GLOBAL_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("Evolution API is not configured for auto send");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/message/sendText/${encodeURIComponent(input.instanceName)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({
      number: input.remoteJid,
      text: input.text,
    }),
  });
  const body = await response.text();
  const payload = body ? JSON.parse(body) : null;

  if (!response.ok) {
    throw new Error(`Evolution sendText failed: ${response.status} ${body}`);
  }

  return payload;
}

function extractSentMessageId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const root = payload as Record<string, unknown>;
  const key = root.key as Record<string, unknown> | undefined;
  if (typeof key?.id === "string") return key.id;
  if (typeof root.id === "string") return root.id;
  if (typeof root.messageId === "string") return root.messageId;
  return undefined;
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
