import "server-only";
import { z } from "zod";

const schema = z.object({
  WHOP_CLIENT_ID: z.string().min(1),
  WHOP_CLIENT_SECRET: z.string().min(1),
  WHOP_COMPANY_API_KEY: z.string().min(1),
  WHOP_PLATFORM_COMPANY_ID: z.string().min(1),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  NEXT_PUBLIC_APP_URL: z.url(),
  WHOP_SANDBOX: z.enum(["true", "false"]).default("false"),
  WHOP_WEBHOOK_SECRET: z.string().optional(),
  DATABASE_URL: z.string().optional(),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

function load(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = JSON.stringify(parsed.error.flatten().fieldErrors, null, 2);
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Lazily-validated, typed env. Throws on first access if anything required is missing. */
export const env = new Proxy({} as Env, {
  get(_target, key: string) {
    return load()[key as keyof Env];
  },
});

export const isSandbox = () => env.WHOP_SANDBOX === "true";

/**
 * Gate for the temporary /api/dev/* test routes. Local development ONLY — Vercel
 * (and any `next build`/`next start`) sets NODE_ENV=production, so these routes
 * return 403 on every deploy and are never reachable on the public URL. They're
 * fully removed at the production cutover (PLATFORM-11).
 */
export const devRoutesEnabled = () => process.env.NODE_ENV !== "production";
