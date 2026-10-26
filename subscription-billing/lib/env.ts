import { z } from "zod";

const envSchema = z.object({
  WHOP_COMPANY_API_KEY: z.string().min(1),
  WHOP_PLAN_ID: z.string().startsWith("plan_"),
  WHOP_CLIENT_ID: z.string().startsWith("app_").optional(),
  WHOP_CLIENT_SECRET: z.string().min(1).optional(),
  WHOP_WEBHOOK_SECRET: z.string().startsWith("ws_").optional(),
  WHOP_SANDBOX: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  SESSION_SECRET: z.string().min(32),
  APP_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

// Parsed on first use, not at import, so `next build` can collect page data
// without the real values present.
export function getEnv(): Env {
  if (cached) return cached;
  cached = envSchema.parse({
    WHOP_COMPANY_API_KEY: process.env.WHOP_COMPANY_API_KEY?.trim(),
    WHOP_PLAN_ID: process.env.WHOP_PLAN_ID?.trim(),
    WHOP_CLIENT_ID: process.env.WHOP_CLIENT_ID?.trim() || undefined,
    WHOP_CLIENT_SECRET: process.env.WHOP_CLIENT_SECRET?.trim() || undefined,
    WHOP_WEBHOOK_SECRET: process.env.WHOP_WEBHOOK_SECRET?.trim() || undefined,
    WHOP_SANDBOX: process.env.WHOP_SANDBOX?.trim(),
    SESSION_SECRET: process.env.SESSION_SECRET,
    APP_URL: process.env.APP_URL?.trim(),
  });
  return cached;
}
