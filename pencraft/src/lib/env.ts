import { z } from "zod";

const envSchema = z.object({
  WHOP_CLIENT_ID: z.string(),
  WHOP_CLIENT_SECRET: z.string(),
  WHOP_API_KEY: z.string(),
  WHOP_COMPANY_ID: z.string(),
  WHOP_SANDBOX: z.string().optional().default("true"),
  DATABASE_URL: z.string(),
  DATABASE_URL_UNPOOLED: z.string(),
  SESSION_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  WHOP_WEBHOOK_SECRET: z.string(),
  ANTHROPIC_API_KEY: z.string(),
  OPENAI_API_KEY: z.string(),
});

type Env = z.infer<typeof envSchema>;

function createEnvProxy(): Env {
  return new Proxy({} as Env, {
    get(_, key: string) {
      const value = process.env[key];
      const shape = envSchema.shape as Record<string, z.ZodTypeAny>;
      const field = shape[key];
      if (!field) throw new Error(`Unknown env var: ${key}`);
      return field.parse(value);
    },
  });
}

export const env = createEnvProxy();
