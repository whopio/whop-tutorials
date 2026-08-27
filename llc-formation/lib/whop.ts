import { getEnv } from "@/lib/env";

// Hardcoded rather than derived from a flag. A production base URL here would
// turn every visitor's submission into a real $500 formation checkout, so the
// production host does not appear in this file at all.
export const SANDBOX_API_BASE = "https://sandbox-api.whop.com/api/v1";

export interface WhopErrorBody {
  status: number;
  message: string;
  type?: string;
  code?: string;
}

// form_company only ever answers 200 with a checkout or 4xx with an error, so
// the caller gets the parsed body either way instead of an exception.
export async function whopPost<T>(
  path: string,
  body: unknown,
  idempotencyKey: string,
): Promise<{ ok: true; data: T } | { ok: false; error: WhopErrorBody }> {
  const env = getEnv();

  const response = await fetch(`${SANDBOX_API_BASE}${path}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${env.WHOP_COMPANY_API_KEY}`,
      "Api-Version-Date": env.WHOP_API_VERSION_DATE,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  const parsed: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      error: {
        status: response.status,
        message: readError(parsed, "message") ?? "Whop did not explain what went wrong.",
        type: readError(parsed, "type"),
        code: readError(parsed, "code"),
      },
    };
  }

  return { ok: true, data: parsed as T };
}

function readError(body: unknown, field: string): string | undefined {
  if (!body || typeof body !== "object" || !("error" in body)) return undefined;
  const error = (body as { error: unknown }).error;
  if (!error || typeof error !== "object" || !(field in error)) return undefined;
  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" ? value : undefined;
}
