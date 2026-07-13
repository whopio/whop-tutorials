import { z } from "zod";

const envSchema = z.object({
  WHOP_COMPANY_API_KEY: z.string().startsWith("apik_"),
  WHOP_COMPANY_ID: z.string().startsWith("biz_"),
  WHOP_SANDBOX: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  APP_URL: z.string().url(),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  cached = envSchema.parse({
    WHOP_COMPANY_API_KEY: process.env.WHOP_COMPANY_API_KEY?.trim(),
    WHOP_COMPANY_ID: process.env.WHOP_COMPANY_ID?.trim(),
    WHOP_SANDBOX: process.env.WHOP_SANDBOX?.trim(),
    APP_URL: process.env.APP_URL?.trim(),
  });
  return cached;
}
