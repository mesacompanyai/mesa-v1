import { createHash } from "node:crypto";

export type EvolutionWebhookPayload = {
  event?: string;
  instance?: string;
  data?: Record<string, unknown>;
  date_time?: string;
  sender?: string;
  server_url?: string;
  apikey?: string;
  destination?: string;
  [key: string]: unknown;
};

type EvolutionKey = {
  remoteJid?: string;
  fromMe?: boolean;
  id?: string;
};

export function normalizeEvolutionEventName(event: unknown): string {
  if (typeof event !== "string" || !event.trim()) return "UNKNOWN";
  return event.trim().replace(/\./g, "_").replace(/-/g, "_").toUpperCase();
}

export function extractEvolutionInstance(payload: EvolutionWebhookPayload): string {
  if (typeof payload.instance === "string" && payload.instance.trim()) {
    return payload.instance.trim();
  }

  const data = payload.data;
  if (data && typeof data.instance === "string" && data.instance.trim()) {
    return data.instance.trim();
  }

  return "unknown-instance";
}

export function extractEvolutionMessageId(payload: EvolutionWebhookPayload): string | null {
  const data = payload.data;
  const key = data?.key as EvolutionKey | undefined;

  if (typeof key?.id === "string" && key.id.trim()) return key.id.trim();
  if (typeof data?.id === "string" && data.id.trim()) return data.id.trim();
  if (typeof data?.messageId === "string" && data.messageId.trim()) return data.messageId.trim();

  return null;
}

export function extractRemoteJid(payload: EvolutionWebhookPayload): string | null {
  const data = payload.data;
  const key = data?.key as EvolutionKey | undefined;

  if (typeof key?.remoteJid === "string" && key.remoteJid.trim()) {
    return key.remoteJid.trim();
  }

  if (typeof data?.remoteJid === "string" && data.remoteJid.trim()) {
    return data.remoteJid.trim();
  }

  return null;
}

export function extractMessageText(payload: EvolutionWebhookPayload): string | null {
  const data = payload.data;
  const message = data?.message as Record<string, unknown> | undefined;

  const direct = [
    message?.conversation,
    (message?.extendedTextMessage as Record<string, unknown> | undefined)?.text,
    data?.text,
    data?.body,
  ].find((value) => typeof value === "string" && value.trim());

  return typeof direct === "string" ? direct.trim() : null;
}

export function extractMessageType(payload: EvolutionWebhookPayload): string {
  const data = payload.data;

  if (typeof data?.messageType === "string" && data.messageType.trim()) {
    return data.messageType.trim();
  }

  const message = data?.message as Record<string, unknown> | undefined;
  const firstMessageKey = message ? Object.keys(message)[0] : null;
  return firstMessageKey || "unknown";
}

export function isFromMe(payload: EvolutionWebhookPayload): boolean {
  const key = payload.data?.key as EvolutionKey | undefined;
  return key?.fromMe === true;
}

export function buildEvolutionIdempotencyKey(payload: EvolutionWebhookPayload): string {
  const instance = extractEvolutionInstance(payload);
  const event = normalizeEvolutionEventName(payload.event);
  const messageId = extractEvolutionMessageId(payload);

  if (messageId) return [instance, event, messageId].join(":");

  const fallback = createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 32);
  return [instance, event, fallback].join(":");
}

export function parseEvolutionTimestamp(payload: EvolutionWebhookPayload): Date {
  const data = payload.data;
  const rawTimestamp = data?.messageTimestamp;

  if (typeof rawTimestamp === "number" && Number.isFinite(rawTimestamp)) {
    return new Date(rawTimestamp * 1000);
  }

  if (typeof rawTimestamp === "string" && rawTimestamp.trim()) {
    const numeric = Number(rawTimestamp);
    if (Number.isFinite(numeric)) return new Date(numeric * 1000);
    const parsed = Date.parse(rawTimestamp);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }

  if (typeof payload.date_time === "string") {
    const parsed = Date.parse(payload.date_time);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }

  return new Date();
}
