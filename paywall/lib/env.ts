import { z } from "zod";

const envSchema = z.object({
  WHOP_COMPANY_API_KEY: z.string().startsWith("apik_"),
  WHOP_PRO_PRODUCT_ID: z.string().startsWith("prod_"),
  WHOP_PRO_PLAN_ID: z.string().startsWith("plan_"),
  WHOP_SANDBOX: z
    .string()
    .optional()
    .transform((v) => v === "true"),
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
    WHOP_PRO_PRODUCT_ID: process.env.WHOP_PRO_PRODUCT_ID?.trim(),
    WHOP_PRO_PLAN_ID: process.env.WHOP_PRO_PLAN_ID?.trim(),
    WHOP_SANDBOX: process.env.WHOP_SANDBOX?.trim(),
    SESSION_SECRET: process.env.SESSION_SECRET,
    APP_URL: process.env.APP_URL?.trim(),
  });
  return cached;
}
