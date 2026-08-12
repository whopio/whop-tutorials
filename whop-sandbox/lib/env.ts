import { z } from "zod";

const envSchema = z.object({
  WHOP_COMPANY_API_KEY: z.string().startsWith("apik_"),
  WHOP_COMPANY_ID: z.string().startsWith("biz_"),
  WHOP_SANDBOX: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  WHOP_WEBHOOK_SECRET: z.string().min(10).optional(),
  WHOP_FEED_WEBHOOK_SECRET: z.string().min(10).optional(),
  DATABASE_URL: z.string().startsWith("postgres").optional(),
  SESSION_SECRET: z.string().min(32),
  APP_URL: z.string().url(),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

// Parses on first call instead of at import time, so `next build` can
// collect page data without real env values present.
export function getEnv(): Env {
  if (cached) return cached;
  cached = envSchema.parse({
    WHOP_COMPANY_API_KEY: process.env.WHOP_COMPANY_API_KEY?.trim(),
    WHOP_COMPANY_ID: process.env.WHOP_COMPANY_ID?.trim(),
    WHOP_SANDBOX: process.env.WHOP_SANDBOX?.trim(),
    WHOP_WEBHOOK_SECRET: process.env.WHOP_WEBHOOK_SECRET?.trim() || undefined,
    WHOP_FEED_WEBHOOK_SECRET:
      process.env.WHOP_FEED_WEBHOOK_SECRET?.trim() || undefined,
    DATABASE_URL: process.env.DATABASE_URL?.trim() || undefined,
    SESSION_SECRET: process.env.SESSION_SECRET,
    APP_URL: process.env.APP_URL?.trim(),
  });
  return cached;
}
