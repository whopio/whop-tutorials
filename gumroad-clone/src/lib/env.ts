import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_UNPOOLED: z.string().min(1),
  WHOP_CLIENT_ID: z.string().min(1),
  WHOP_CLIENT_SECRET: z.string().min(1),
  WHOP_API_KEY: z.string().min(1),
  WHOP_COMPANY_API_KEY: z.string().min(1),
  WHOP_COMPANY_ID: z.string().min(1),
  WHOP_WEBHOOK_SECRET: z.string().min(1),
  UPLOADTHING_TOKEN: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  PLATFORM_FEE_PERCENT: z.coerce.number().min(0).max(100).default(5),
  WHOP_SANDBOX: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

export const env = new Proxy({} as Env, {
  get(_, key: string) {
    const value = process.env[key];
    const field = envSchema.shape[key as keyof typeof envSchema.shape];
    if (field) return field.parse(value);
    return value;
  },
});
