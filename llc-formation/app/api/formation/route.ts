import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { applicationSchema } from "@/lib/formation/schema";
import { preflight } from "@/lib/formation/preflight";
import { findUnchecked } from "@/lib/formation/unchecked";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  // getEnv throws unless WHOP_SANDBOX is true, so a misconfigured deploy fails
  // here rather than quietly billing somebody five hundred dollars.
  const env = getEnv();

  if (!checkRateLimit(clientIp(request))) {
    return Response.json(
      { error: "Too many submissions. Wait a minute and try again." },
      { status: 429 },
    );
  }

  const parsed = applicationSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json(
      { error: "That application is not shaped like an application.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // A fresh key every time. Replaying a used Idempotency-Key with a different
  // body is its own 400, which would read as a validation failure the visitor
  // did not cause.
  const result = await preflight(parsed.data, randomUUID());

  return Response.json({
    accountId: env.WHOP_COMPANY_ID,
    result,
    unchecked: findUnchecked(parsed.data),
  });
}
