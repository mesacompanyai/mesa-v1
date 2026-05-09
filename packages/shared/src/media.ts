export type MesaMediaKind = "image" | "audio" | "video" | "document" | "sticker" | "unknown";

const IMAGE_TYPES = new Set(["imageMessage", "image"]);
const AUDIO_TYPES = new Set(["audioMessage", "ptt", "audio"]);
const VIDEO_TYPES = new Set(["videoMessage", "video"]);
const DOCUMENT_TYPES = new Set(["documentMessage", "document"]);
const STICKER_TYPES = new Set(["stickerMessage", "sticker"]);

export function detectMediaKind(messageType?: string | null, mimeType?: string | null): MesaMediaKind {
  const normalizedType = messageType || "";
  const normalizedMime = (mimeType || "").toLowerCase();

  if (IMAGE_TYPES.has(normalizedType) || normalizedMime.startsWith("image/")) return "image";
  if (AUDIO_TYPES.has(normalizedType) || normalizedMime.startsWith("audio/")) return "audio";
  if (VIDEO_TYPES.has(normalizedType) || normalizedMime.startsWith("video/")) return "video";
  if (DOCUMENT_TYPES.has(normalizedType) || normalizedMime === "application/pdf") return "document";
  if (STICKER_TYPES.has(normalizedType) || normalizedMime === "image/webp") return "sticker";

  return "unknown";
}

export function buildMediaStorageKey(input: {
  tenantId: string;
  conversationId?: string | null;
  messageId?: string | null;
  mediaAssetId: string;
  extension?: string | null;
}): string {
  const extension = input.extension?.replace(/^\./, "");
  const suffix = extension ? `.${extension}` : "";
  const conversationPart = input.conversationId || "unassigned";
  const messagePart = input.messageId || "message";

  return [
    "tenants",
    input.tenantId,
    "conversations",
    conversationPart,
    "messages",
    messagePart,
    `${input.mediaAssetId}${suffix}`,
  ].join("/");
}
