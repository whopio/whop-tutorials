import { z } from "zod";

const envSchema = z.object({
  WHOP_APP_API_KEY: z.string().min(1),
  WHOP_CLIENT_ID: z.string().min(1),
  WHOP_CLIENT_SECRET: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url(),

  WHOP_COMPANY_API_KEY: z.string().min(1),
  WHOP_COMPANY_ID: z.string().min(1),
  WHOP_WEBHOOK_SECRET: z.string().min(1),
  STORYLINE_PLUS_PLAN_ID: z.string().min(1),

  UPLOADTHING_TOKEN: z.string().min(1),

  ROOT_OPERATOR_EMAIL: z.string().email(),
  OPERATOR_TOPUP_PAYMENT_METHOD_ID: z.string().optional(),

  CRON_SECRET: z.string().min(16),

  TIP_PLATFORM_FEE_PERCENT: z.string().default("10"),
  PLATFORM_PLUS_FEE_PERCENT: z.string().default("30"),
  STORYLINE_PLUS_MONTHLY_PRICE: z.string().default("5"),
  PARTNER_PAYOUT_MIN_USD: z.string().default("1"),

  NEXT_PUBLIC_WHOP_SANDBOX: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

export const env = new Proxy({} as Env, {
  get(_, key: string) {
    const value = process.env[key];
    const field = envSchema.shape[key as keyof typeof envSchema.shape];
    if (field) field.parse(value);
    return value as Env[keyof Env];
  },
});
