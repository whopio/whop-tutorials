import { z } from "zod";

const schema = z.object({
  WHOP_COMPANY_API_KEY: z.string().min(1, "WHOP_COMPANY_API_KEY is missing"),
  WHOP_PLATFORM_ACCOUNT_ID: z
    .string()
    .startsWith("biz_", "WHOP_PLATFORM_ACCOUNT_ID must start with biz_"),
  WHOP_WEBHOOK_SECRET: z.string().optional(),
  // Stands in for a seller's real email address, which a marketplace would
  // already have. Whop checks that the address really accepts mail, so it
  // cannot be invented.
  DEMO_SELLER_EMAIL: z.string().email("DEMO_SELLER_EMAIL must be an email address"),
  WHOP_SANDBOX: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  SESSION_PASSWORD: z
    .string()
    .min(32, "SESSION_PASSWORD must be at least 32 characters"),
  APP_URL: z.string().url("APP_URL must be a full URL"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;

  // An unset line in a .env file arrives as an empty string, not undefined,
  // so .optional() alone would not save us. Strip the blanks first.
  const raw: Record<string, string | undefined> = { ...process.env };
  for (const key of Object.keys(raw)) {
    if (raw[key] === "") delete raw[key];
  }

  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Environment is not configured.\n${problems}`);
  }

  cached = parsed.data;
  return cached;
}
