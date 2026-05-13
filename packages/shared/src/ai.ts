import { z } from "zod";

export const OPENAI_DEFAULT_TEXT_MODEL = "gpt-4o-mini";
export const OPENAI_DEFAULT_VISION_MODEL = "gpt-4o-mini";
export const OPENAI_DEFAULT_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";

export const ReservationAnalysisSchema = z.object({
  status: z.enum(["none", "collecting", "ready_to_confirm", "confirmed", "needs_review"]).default("none"),
  customerName: z.string().nullable().default(null),
  date: z.string().nullable().default(null),
  time: z.string().nullable().default(null),
  partySize: z.number().int().positive().nullable().default(null),
  areaPreference: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});

export const MemorySchema = z.object({
  scope: z.enum(["lifetime", "reservation"]).default("reservation"),
  category: z.string().default("observacao"),
  label: z.string().default("Memoria capturada"),
  value: z.string().nullable().default(null),
  confidence: z.number().min(0).max(1).nullable().default(null),
});

export const ReservationFactSchema = z.object({
  category: z.string().default("observacao"),
  label: z.string().default("Fato da reserva"),
  value: z.string().nullable().default(null),
  confidence: z.number().min(0).max(1).nullable().default(null),
});

export const ConversationAnalysisSchema = z.object({
  intent: z.string().default("unknown"),
  replyDraft: z.string().default("Recebemos sua mensagem. A equipe vai revisar e responder em seguida."),
  requiresHumanReview: z.boolean().default(true),
  canAutoSend: z.boolean().default(false),
  withinGuide: z.boolean().default(false),
  confidence: z.number().min(0).max(1).default(0.3),
  reviewReason: z.string().nullable().default(null),
  missingFields: z.array(z.string()).default([]),
  reservation: ReservationAnalysisSchema.default({
    status: "none",
    customerName: null,
    date: null,
    time: null,
    partySize: null,
    areaPreference: null,
    notes: null,
  }),
  memories: z.array(MemorySchema).default([]),
  reservationFacts: z.array(ReservationFactSchema).default([]),
});

export type ConversationAnalysis = z.infer<typeof ConversationAnalysisSchema>;
export type ReservationAnalysis = z.infer<typeof ReservationAnalysisSchema>;

export const CONVERSATION_ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: { type: "string" },
    replyDraft: { type: "string" },
    requiresHumanReview: { type: "boolean" },
    canAutoSend: { type: "boolean" },
    withinGuide: { type: "boolean" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reviewReason: { type: ["string", "null"] },
    missingFields: {
      type: "array",
      items: { type: "string" },
    },
    reservation: {
      type: "object",
      additionalProperties: false,
      properties: {
        status: { type: "string", enum: ["none", "collecting", "ready_to_confirm", "confirmed", "needs_review"] },
        customerName: { type: ["string", "null"] },
        date: { type: ["string", "null"], description: "YYYY-MM-DD when known" },
        time: { type: ["string", "null"], description: "HH:mm in restaurant local time when known" },
        partySize: { type: ["number", "null"] },
        areaPreference: { type: ["string", "null"] },
        notes: { type: ["string", "null"] },
      },
      required: ["status", "customerName", "date", "time", "partySize", "areaPreference", "notes"],
    },
    memories: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          scope: { type: "string", enum: ["lifetime", "reservation"] },
          category: { type: "string" },
          label: { type: "string" },
          value: { type: ["string", "null"] },
          confidence: { type: ["number", "null"], minimum: 0, maximum: 1 },
        },
        required: ["scope", "category", "label", "value", "confidence"],
      },
    },
    reservationFacts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string" },
          label: { type: "string" },
          value: { type: ["string", "null"] },
          confidence: { type: ["number", "null"], minimum: 0, maximum: 1 },
        },
        required: ["category", "label", "value", "confidence"],
      },
    },
  },
  required: [
    "intent",
    "replyDraft",
    "requiresHumanReview",
    "canAutoSend",
    "withinGuide",
    "confidence",
    "reviewReason",
    "missingFields",
    "reservation",
    "memories",
    "reservationFacts",
  ],
};

export function fallbackConversationAnalysis(text: string, reviewReason = "fallback"): ConversationAnalysis {
  return {
    intent: "needs_review",
    replyDraft: "Recebemos sua mensagem. A equipe vai revisar e responder em seguida.",
    requiresHumanReview: true,
    canAutoSend: false,
    withinGuide: false,
    confidence: 0.3,
    reviewReason,
    missingFields: [],
    reservation: {
      status: "needs_review",
      customerName: null,
      date: null,
      time: null,
      partySize: null,
      areaPreference: null,
      notes: null,
    },
    memories: [],
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

export function hasRequiredReservationFields(reservation: ReservationAnalysis): boolean {
  return Boolean(reservation.customerName?.trim() && reservation.date?.trim() && reservation.time?.trim() && reservation.partySize);
}

export function shouldAutoSendAnalysis(analysis: ConversationAnalysis): boolean {
  return analysis.canAutoSend && analysis.withinGuide && !analysis.requiresHumanReview && analysis.confidence >= 0.65;
}
