import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import {
  CONVERSATION_ANALYSIS_JSON_SCHEMA,
  ConversationAnalysis,
  ConversationAnalysisSchema,
  fallbackConversationAnalysis,
  OPENAI_DEFAULT_TEXT_MODEL,
  OPENAI_DEFAULT_TRANSCRIPTION_MODEL,
  OPENAI_DEFAULT_VISION_MODEL,
} from "../../../../packages/shared/src";

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
      return fallbackConversationAnalysis(input.text, "openai_not_configured");
    }

    const model = this.config.get<string>("OPENAI_TEXT_MODEL") || OPENAI_DEFAULT_TEXT_MODEL;
    const response = await this.client.responses.create({
      model,
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
          content:
            "You are Mesa, a Portuguese-speaking restaurant reservation assistant. Analyze the message against the restaurant guide, extract reservation data, and return only the required structured output. Keep customer-facing replies concise and natural in Portuguese.",
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
      return fallbackConversationAnalysis(input.text, "invalid_openai_output");
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

    const model = this.config.get<string>("OPENAI_TRANSCRIPTION_MODEL") || OPENAI_DEFAULT_TRANSCRIPTION_MODEL;
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

    const model = this.config.get<string>("OPENAI_VISION_MODEL") || OPENAI_DEFAULT_VISION_MODEL;
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
}
