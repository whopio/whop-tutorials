import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  WHOP_SANDBOX: z.string().optional().default("true"),
  WHOP_PLATFORM_COMPANY_ID: z.string().min(1),
  WHOP_CLIENT_ID: z.string().min(1),
  WHOP_CLIENT_SECRET: z.string().min(1),
  WHOP_COMPANY_API_KEY: z.string().min(1),
  WHOP_WEBHOOK_SECRET: z.string().optional().default(""),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_WHOP_APP_ID: z.string().min(1),
  NEXT_PUBLIC_WHOP_COMPANY_ID: z.string().min(1),
  NEXT_PUBLIC_PLATFORM_FEE_PERCENT: z.string().optional().default("5"),
});

type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

function validate(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables. Check your .env file.");
  }
  cached = parsed.data;
  return cached;
}

export const env = new Proxy({} as ServerEnv, {
  get(_target, prop: string) {
    return validate()[prop as keyof ServerEnv];
  },
});

export function isSandbox(): boolean {
  return env.WHOP_SANDBOX !== "false";
}

export function whopApiBaseUrl(): string {
  return isSandbox()
    ? "https://sandbox-api.whop.com/api/v1"
    : "https://api.whop.com/api/v1";
}

export function whopOAuthBaseUrl(): string {
  return isSandbox() ? "https://sandbox-api.whop.com" : "https://api.whop.com";
}

export function platformFeePercent(): number {
  const n = Number(env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT);
  return Number.isFinite(n) ? n : 5;
}
