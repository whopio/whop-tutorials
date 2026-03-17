import { z } from "zod";

const envSchema = z.object({
  // Whop
  WHOP_APP_ID: z.string().startsWith("app_"),
  WHOP_API_KEY: z.string().startsWith("apik_"),
  WHOP_COMPANY_ID: z.string().startsWith("biz_"),
  WHOP_CLIENT_ID: z.string().min(1),
  WHOP_CLIENT_SECRET: z.string().min(1),
  WHOP_COMPANY_API_KEY: z.string().startsWith("apik_"),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url(),

  // Session
  SESSION_SECRET: z.string().min(32),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // AI
  ANTHROPIC_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),

  // Webhooks
  WHOP_WEBHOOK_SECRET: z.string().min(1),

  // Sandbox (optional)
  WHOP_SANDBOX: z.string().optional(),
});

// Lazy validation — only validates at runtime when env vars are first accessed,
// not during the build phase when env vars may not be set.
let _env: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (!_env) {
    _env = envSchema.parse(process.env);
  }
  return _env;
}

/** Direct access for convenience — validates on first use */
export const env = new Proxy({} as z.infer<typeof envSchema>, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof z.infer<typeof envSchema>];
  },
});
