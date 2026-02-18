import { z } from "zod";

const envSchema = z.object({
  WHOP_API_KEY: z.string().trim().min(1),
  WHOP_APP_ID: z.string().trim().min(1),
  WHOP_CLIENT_ID: z.string().trim().min(1),
  WHOP_CLIENT_SECRET: z.string().trim().min(1),
  WHOP_WEBHOOK_SECRET: z.string().trim().min(1),
  WHOP_COMPANY_ID: z.string().trim().min(1),
  WHOP_API_BASE: z.string().trim().url().default("https://api.whop.com"),
  DATABASE_URL: z.string().trim().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().min(1),
  NEXT_PUBLIC_APP_URL: z.string().trim().url(),
  SESSION_SECRET: z.string().trim().min(32),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
  PLATFORM_FEE_PERCENT: z.coerce.number().default(9.5),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;

export const env: Env = new Proxy({} as Env, {
  get(_, prop: string) {
    if (!_env) {
      _env = envSchema.parse(process.env);
    }
    return _env[prop as keyof Env];
  },
});
