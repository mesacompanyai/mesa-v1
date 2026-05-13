import { describe, expect, it } from "vitest";
import {
  ConversationAnalysisSchema,
  fallbackConversationAnalysis,
  selectSmallestAvailableTable,
  shouldAutoSendAnalysis,
} from "../packages/shared/src";

describe("AI conversation analysis policy", () => {
  it("accepts a valid structured OpenAI response", () => {
    const parsed = ConversationAnalysisSchema.parse({
      intent: "reservation_request",
      replyDraft: "Perfeito, sua reserva esta confirmada.",
      requiresHumanReview: false,
      canAutoSend: true,
      withinGuide: true,
      confidence: 0.92,
      reviewReason: null,
      missingFields: [],
      reservation: {
        status: "ready_to_confirm",
        customerName: "Helena",
        date: "2026-05-12",
        time: "20:00",
        partySize: 2,
        areaPreference: "salao",
        notes: null,
      },
      memories: [],
      reservationFacts: [],
    });

    expect(parsed.reservation.partySize).toBe(2);
    expect(shouldAutoSendAnalysis(parsed)).toBe(true);
  });

  it("falls back to human review by default", () => {
    const analysis = fallbackConversationAnalysis("Preciso falar sobre um pagamento");
    expect(analysis.requiresHumanReview).toBe(true);
    expect(analysis.canAutoSend).toBe(false);
    expect(shouldAutoSendAnalysis(analysis)).toBe(false);
  });

  it("blocks auto send outside the guide", () => {
    const analysis = ConversationAnalysisSchema.parse({
      ...fallbackConversationAnalysis("Mensagem fora do guia"),
      requiresHumanReview: false,
      canAutoSend: true,
      withinGuide: false,
      confidence: 0.9,
    });

    expect(shouldAutoSendAnalysis(analysis)).toBe(false);
  });
});

describe("table availability", () => {
  it("selects the smallest free table that fits the party", () => {
    const table = selectSmallestAvailableTable(
      [
        { id: "t1", number: 1, seats: 2, location: "inside", active: true },
        { id: "t2", number: 2, seats: 4, location: "inside", active: true },
        { id: "t3", number: 3, seats: 6, location: "inside", active: true },
      ],
      [],
      3,
    );

    expect(table?.id).toBe("t2");
  });

  it("treats confirmed and seated reservations as blocking", () => {
    const table = selectSmallestAvailableTable(
      [
        { id: "t1", number: 1, seats: 2, location: "inside", active: true },
        { id: "t2", number: 2, seats: 4, location: "inside", active: true },
      ],
      [{ tableId: "t2", status: "confirmed" }],
      3,
    );

    expect(table).toBeNull();
  });

  it("treats completed and cancelled reservations as available again", () => {
    const table = selectSmallestAvailableTable(
      [{ id: "t2", number: 2, seats: 4, location: "outside", active: true }],
      [
        { tableId: "t2", status: "completed" },
        { tableId: "t2", status: "cancelled" },
      ],
      3,
      "area externa",
    );

    expect(table?.id).toBe("t2");
  });
});
