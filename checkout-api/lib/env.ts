import { z } from "zod";

const schema = z.object({
  WHOP_COMPANY_API_KEY: z.string().min(1, "WHOP_COMPANY_API_KEY is missing"),
  WHOP_WEBHOOK_SECRET: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  WHOP_SANDBOX: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  APP_URL: z.string().url("APP_URL must be a full URL"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Environment is not configured.\n${problems}`);
  }

  cached = parsed.data;
  return cached;
}
