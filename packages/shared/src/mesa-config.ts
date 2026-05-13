import { z } from "zod";

export const DEFAULT_AI_GUIDE_TOPICS = [
  { id: "q1", label: "Nome do cliente", enabled: true, required: true, fixed: true },
  { id: "q2", label: "Data da reserva", enabled: true, required: true, fixed: true },
  { id: "q3", label: "Horario", enabled: true, required: true, fixed: true },
  { id: "q4", label: "Quantidade de pessoas", enabled: true, required: true, fixed: true },
  { id: "q5", label: "Preferencia de area", enabled: true, required: false, fixed: true },
  { id: "q6", label: "Restricao alimentar", enabled: true, required: false, fixed: true },
  { id: "q7", label: "Intolerancia", enabled: true, required: false, fixed: true },
  { id: "q8", label: "Havera criancas?", enabled: true, required: false, fixed: true },
  { id: "q9", label: "Havera pet?", enabled: false, required: false, fixed: true },
  { id: "q10", label: "E comemoracao?", enabled: true, required: false, fixed: true },
] as const;

export const DEFAULT_BUSINESS_HOURS = [
  { day: "Seg", enabled: false, open: "12:00", close: "23:30" },
  { day: "Ter", enabled: true, open: "12:00", close: "23:30" },
  { day: "Qua", enabled: true, open: "12:00", close: "23:30" },
  { day: "Qui", enabled: true, open: "12:00", close: "23:30" },
  { day: "Sex", enabled: true, open: "12:00", close: "23:30" },
  { day: "Sab", enabled: true, open: "12:00", close: "23:30" },
  { day: "Dom", enabled: true, open: "12:00", close: "23:30" },
] as const;

export const DEFAULT_RESTAURANT_SETTINGS = {
  autonomy: "media",
  tone: "Acolhedor, objetivo e profissional.",
  characteristics: {
    petFriendly: true,
    outdoor: true,
    highEnd: true,
    birthdays: true,
  },
  teamContactTriggers: {
    waitingCustomer: true,
    reservationScheduled: true,
    reservationArriving: true,
    reservationCancelled: true,
  },
  menuSettings: {
    canSendFiles: true,
    sendMode: "on_request",
  },
  humanReviewTriggers: [
    "mensagem fora do Guia de Atendimento",
    "reclamacao ou conflito",
    "pagamento",
    "sem mesa compativel",
    "baixa confianca da IA",
  ],
} as const;

export const AiGuideTopicSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  enabled: z.boolean().default(true),
  required: z.boolean().default(false),
  fixed: z.boolean().default(false),
});

export const RestaurantSettingsSchema = z.object({
  autonomy: z.enum(["baixa", "media", "alta"]).default(DEFAULT_RESTAURANT_SETTINGS.autonomy),
  tone: z.string().default(DEFAULT_RESTAURANT_SETTINGS.tone),
  characteristics: z
    .object({
      petFriendly: z.boolean().default(true),
      outdoor: z.boolean().default(true),
      highEnd: z.boolean().default(true),
      birthdays: z.boolean().default(true),
    })
    .default(DEFAULT_RESTAURANT_SETTINGS.characteristics),
  teamContactTriggers: z
    .object({
      waitingCustomer: z.boolean().default(true),
      reservationScheduled: z.boolean().default(true),
      reservationArriving: z.boolean().default(true),
      reservationCancelled: z.boolean().default(true),
    })
    .default(DEFAULT_RESTAURANT_SETTINGS.teamContactTriggers),
  menuSettings: z
    .object({
      canSendFiles: z.boolean().default(true),
      sendMode: z.enum(["on_request", "default"]).default("on_request"),
    })
    .default(DEFAULT_RESTAURANT_SETTINGS.menuSettings),
  humanReviewTriggers: z.array(z.string()).default([...DEFAULT_RESTAURANT_SETTINGS.humanReviewTriggers]),
});

export const RestaurantAiGuideSchema = z.object({
  topics: z.array(AiGuideTopicSchema).default([...DEFAULT_AI_GUIDE_TOPICS]),
});

export type AiGuideTopic = z.infer<typeof AiGuideTopicSchema>;
export type RestaurantSettings = z.infer<typeof RestaurantSettingsSchema>;
export type RestaurantAiGuide = z.infer<typeof RestaurantAiGuideSchema>;

export function parseRestaurantSettings(value: unknown): RestaurantSettings {
  return RestaurantSettingsSchema.parse({
    ...DEFAULT_RESTAURANT_SETTINGS,
    ...(isRecord(value) ? value : {}),
    characteristics: {
      ...DEFAULT_RESTAURANT_SETTINGS.characteristics,
      ...(isRecord(value) && isRecord(value.characteristics) ? value.characteristics : {}),
    },
    teamContactTriggers: {
      ...DEFAULT_RESTAURANT_SETTINGS.teamContactTriggers,
      ...(isRecord(value) && isRecord(value.teamContactTriggers) ? value.teamContactTriggers : {}),
    },
    menuSettings: {
      ...DEFAULT_RESTAURANT_SETTINGS.menuSettings,
      ...(isRecord(value) && isRecord(value.menuSettings) ? value.menuSettings : {}),
    },
  });
}

export function parseRestaurantAiGuide(value: unknown): RestaurantAiGuide {
  const topics = isRecord(value) && Array.isArray(value.topics) ? value.topics : [...DEFAULT_AI_GUIDE_TOPICS];
  return RestaurantAiGuideSchema.parse({ topics });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
