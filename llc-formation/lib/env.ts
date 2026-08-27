import { z } from "zod";

const schema = z.object({
  WHOP_COMPANY_API_KEY: z.string().min(1, "WHOP_COMPANY_API_KEY is missing"),
  WHOP_COMPANY_ID: z
    .string()
    .startsWith("biz_", "WHOP_COMPANY_ID must start with biz_"),
  // form_company is a beta endpoint, so every request pins the version this
  // was written against. Leaving the header off pins to the 2025-01-01 shapes.
  WHOP_API_VERSION_DATE: z.string().min(1).default("2026-08-13"),
  // Not optional the way it is in the other demos. This one only ever runs
  // against the sandbox, so the flag is required and checked.
  WHOP_SANDBOX: z
    .string()
    .transform((value) => value === "true")
    .pipe(
      z.literal(true, "WHOP_SANDBOX must be true, this demo never runs on production"),
    ),
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
