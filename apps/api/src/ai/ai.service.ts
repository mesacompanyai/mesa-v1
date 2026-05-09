import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

export type ConversationAnalysis = {
  intent: string;
  replyDraft: string;
  requiresHumanReview: boolean;
  memories: Array<{
    scope: "lifetime" | "reservation";
    category: string;
    label: string;
    value?: string;
    confidence?: number;
  }>;
  reservationFacts: Array<{
    category: string;
    label: string;
    value?: unknown;
    confidence?: number;
  }>;
};

@Injectable()
export class AiService {
  private readonly client?: OpenAI;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  async analyzeConversationText(input: {
    restaurantName?: string;
    customerName?: string;
    text: string;
  }): Promise<ConversationAnalysis> {
    if (!this.client) {
      return this.fallbackAnalysis(input.text);
    }

    const model = this.config.get<string>("OPENAI_TEXT_MODEL") || "gpt-4.1-mini";
    const response = await this.client.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "You are Mesa, a restaurant reservation assistant. Return only strict JSON with keys: intent, replyDraft, requiresHumanReview, memories, reservationFacts. The product is in pilot mode, so sensitive confirmations should require human review.",
        },
        {
          role: "user",
          content: JSON.stringify({
            restaurantName: input.restaurantName,
            customerName: input.customerName,
            message: input.text,
          }),
        },
      ],
    });

    const outputText = (response as { output_text?: string }).output_text || "{}";
    try {
      return ConversationAnalysisSchema.parse(JSON.parse(outputText));
    } catch {
      return this.fallbackAnalysis(input.text);
    }
  }

  async transcribeAudio(input: {
    buffer: Buffer;
    fileName: string;
    mimeType?: string;
  }): Promise<{ text: string; model: string }> {
    if (!this.client) {
      throw new Error("OPENAI_API_KEY is required for audio transcription");
    }

    const model = this.config.get<string>("OPENAI_TRANSCRIPTION_MODEL") || "gpt-4o-mini-transcribe";
    const transcription = await this.client.audio.transcriptions.create({
      file: await toFile(input.buffer, input.fileName, { type: input.mimeType }),
      model,
    });

    return {
      text: (transcription as { text?: string }).text || "",
      model,
    };
  }

  async analyzeImage(input: { imageUrl: string; prompt?: string }): Promise<string> {
    if (!this.client) {
      throw new Error("OPENAI_API_KEY is required for image analysis");
    }

    const model = this.config.get<string>("OPENAI_VISION_MODEL") || "gpt-4.1-mini";
    const response = await this.client.responses.create({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                input.prompt ||
                "Analyze this WhatsApp image for a restaurant reservation context. Extract visible text, menu details, reservation-relevant facts, and safety issues.",
            },
            {
              type: "input_image",
              image_url: input.imageUrl,
            },
          ],
        },
      ] as never,
    });

    return (response as { output_text?: string }).output_text || "";
  }

  private fallbackAnalysis(text: string): ConversationAnalysis {
    return {
      intent: "needs_review",
      replyDraft: "Recebemos sua mensagem. A equipe vai revisar e responder em seguida.",
      requiresHumanReview: true,
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
}

import { z } from "zod";

const MemorySchema = z.object({
  scope: z.enum(["lifetime", "reservation"]).default("reservation"),
  category: z.string().default("observacao"),
  label: z.string().default("Memoria capturada"),
  value: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const ReservationFactSchema = z.object({
  category: z.string().default("observacao"),
  label: z.string().default("Fato da reserva"),
  value: z.unknown().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const ConversationAnalysisSchema = z.object({
  intent: z.string().default("unknown"),
  replyDraft: z.string().default("Recebemos sua mensagem. A equipe vai revisar e responder em seguida."),
  requiresHumanReview: z.boolean().default(true),
  memories: z.array(MemorySchema).default([]),
  reservationFacts: z.array(ReservationFactSchema).default([]),
});
