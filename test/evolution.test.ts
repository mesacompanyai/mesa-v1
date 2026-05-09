import { describe, expect, it } from "vitest";
import {
  buildEvolutionIdempotencyKey,
  detectMediaKind,
  extractMessageText,
  normalizeEvolutionEventName,
} from "../packages/shared/src";

describe("Evolution payload helpers", () => {
  it("normalizes event names", () => {
    expect(normalizeEvolutionEventName("messages.upsert")).toBe("MESSAGES_UPSERT");
    expect(normalizeEvolutionEventName("connection-update")).toBe("CONNECTION_UPDATE");
  });

  it("builds stable idempotency keys from instance, event and message id", () => {
    const payload = {
      event: "messages.upsert",
      instance: "restaurant-a",
      data: {
        key: {
          remoteJid: "5511999999999@s.whatsapp.net",
          id: "ABC123",
        },
      },
    };

    expect(buildEvolutionIdempotencyKey(payload)).toBe("restaurant-a:MESSAGES_UPSERT:ABC123");
  });

  it("extracts common text message shapes", () => {
    expect(
      extractMessageText({
        event: "messages.upsert",
        instance: "restaurant-a",
        data: { message: { conversation: "Mesa para duas pessoas" } },
      }),
    ).toBe("Mesa para duas pessoas");
  });
});

describe("media helpers", () => {
  it("detects common media kinds", () => {
    expect(detectMediaKind("audioMessage", "audio/ogg")).toBe("audio");
    expect(detectMediaKind("imageMessage", "image/jpeg")).toBe("image");
    expect(detectMediaKind("documentMessage", "application/pdf")).toBe("document");
  });
});
