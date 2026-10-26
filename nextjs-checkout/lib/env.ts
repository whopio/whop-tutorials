import { z } from "zod";

const envSchema = z.object({
  WHOP_COMPANY_API_KEY: z.string().min(1),
  WHOP_WEBHOOK_SECRET: z.string().min(1),
  WHOP_SANDBOX: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  NEXT_PUBLIC_WHOP_SUBSCRIPTION_PLAN_ID: z.string().startsWith("plan_"),
  NEXT_PUBLIC_WHOP_LIFETIME_PLAN_ID: z.string().startsWith("plan_"),
  NEXT_PUBLIC_APP_URL: z.url(),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

function parseAll(): Env {
  if (cached) return cached;
  cached = envSchema.parse({
    WHOP_COMPANY_API_KEY: process.env.WHOP_COMPANY_API_KEY,
    WHOP_WEBHOOK_SECRET: process.env.WHOP_WEBHOOK_SECRET,
    WHOP_SANDBOX: process.env.WHOP_SANDBOX,
    NEXT_PUBLIC_WHOP_SUBSCRIPTION_PLAN_ID:
      process.env.NEXT_PUBLIC_WHOP_SUBSCRIPTION_PLAN_ID,
    NEXT_PUBLIC_WHOP_LIFETIME_PLAN_ID:
      process.env.NEXT_PUBLIC_WHOP_LIFETIME_PLAN_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
  return cached;
}

export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return parseAll()[prop as keyof Env];
  },
});
