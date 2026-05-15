import { z } from "zod";
import {
  OPENAI_DEFAULT_TEXT_MODEL,
  OPENAI_DEFAULT_TRANSCRIPTION_MODEL,
  OPENAI_DEFAULT_VISION_MODEL,
} from "../../../../packages/shared/src";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_API_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().url().optional(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  EVOLUTION_WEBHOOK_SECRET: z.string().min(12).optional(),
  EVOLUTION_API_URL: z.string().url().optional(),
  EVOLUTION_GLOBAL_API_KEY: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.string().url().optional().or(z.literal("")),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_TEXT_MODEL: z.string().default(OPENAI_DEFAULT_TEXT_MODEL),
  OPENAI_VISION_MODEL: z.string().default(OPENAI_DEFAULT_VISION_MODEL),
  OPENAI_TRANSCRIPTION_MODEL: z.string().default(OPENAI_DEFAULT_TRANSCRIPTION_MODEL),
  SENTRY_DSN: z.string().url().optional().or(z.literal("")),
});

export type MesaEnvironment = z.infer<typeof environmentSchema>;

export function validateEnvironment(config: Record<string, unknown>): MesaEnvironment {
  const parsed = environmentSchema.safeParse(config);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid environment: ${errors}`);
  }

  return parsed.data;
}
