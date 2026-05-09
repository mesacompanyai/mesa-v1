export const QUEUE_NAMES = {
  evolutionEvents: "evolution-events",
  messageProcessing: "message-processing",
  mediaProcessing: "media-processing",
  aiProcessing: "ai-processing",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export type EvolutionWebhookJob = {
  messageEventId: string;
  idempotencyKey: string;
};

export type MessageProcessingJob = {
  tenantId: string;
  conversationId: string;
  messageId: string;
};

export type MediaProcessingJob = {
  tenantId: string;
  mediaAssetId: string;
  messageId?: string;
  conversationId?: string;
};

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: "exponential" as const,
    delay: 1_000,
  },
  removeOnComplete: {
    age: 60 * 60 * 24,
    count: 1_000,
  },
  removeOnFail: {
    age: 60 * 60 * 24 * 7,
    count: 5_000,
  },
};
