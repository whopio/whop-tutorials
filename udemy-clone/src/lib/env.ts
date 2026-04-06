import { z } from "zod";

const envSchema = z.object({
  WHOP_CLIENT_ID: z.string().min(1),
  WHOP_CLIENT_SECRET: z.string().min(1),
  WHOP_API_KEY: z.string().min(1),
  WHOP_COMPANY_ID: z.string().startsWith("biz_"),
  WHOP_WEBHOOK_SECRET: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_UNPOOLED: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().min(1),
  MUX_TOKEN_ID: z.string().min(1).optional(),
  MUX_TOKEN_SECRET: z.string().min(1).optional(),
  MUX_WEBHOOK_SECRET: z.string().min(1).optional(),
  MUX_SIGNING_KEY_ID: z.string().min(1).optional(),
  MUX_SIGNING_PRIVATE_KEY: z.string().min(1).optional(),
  PLATFORM_FEE_PERCENT: z.string().optional(),
  WHOP_SANDBOX: z.string().optional(),
});

type EnvType = z.infer<typeof envSchema>;

let _env: EnvType | null = null;

export function getEnv(): EnvType {
  if (!_env) {
    _env = envSchema.parse(process.env);
  }
  return _env;
}

export const env = new Proxy({} as EnvType, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof EnvType];
  },
});
