import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { whop } from "@/lib/whop";
import { getEnv } from "@/lib/env";
import { getVisitorId } from "@/lib/session";
import { readState, writeState } from "@/lib/store";

import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { VERIFY_COUNTRIES } from "@/constants/demo";

const countryCodes = VERIFY_COUNTRIES.map((c) => c.code);

const body = z.object({
  person: z.object({ first: z.string().min(1), last: z.string().min(1) }),
  country: z.enum(countryCodes as unknown as [string, ...string[]]),
});

// A real app is verifying somebody it already has. This demo has nobody, so it
// makes a throwaway account to verify and then forgets about it. None of this
// is part of the article.
function demoEmail(base: string, visitorRef: string): string {
  const [name, domain] = base.split("@");
  return `${name}+kyc-${visitorRef.slice(0, 8)}@${domain}`;
}

// A reload should not lose the account this visitor already has.
export async function GET() {
  const state = await readState();
  return NextResponse.json({ accountId: state.accountId ?? null });
}

export async function POST(request: Request) {
  if (!checkRateLimit(clientIp(request), 3)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // One account per visitor. Coming back to the page does not make a second.
  const existing = await readState();
  if (existing.accountId) {
    return NextResponse.json({ accountId: existing.accountId, reused: true });
  }

  const env = getEnv();
  const visitorRef = await getVisitorId();
  const { person, country } = parsed.data;

  // No two accounts under one platform may share a title, and Whop rejects the
  // second with "You have already created an account with the same name". The
  // visitor id survives a reset, so it cannot be the only thing making this
  // unique or starting over would collide with the run before it.
  const title = `${person.first} ${person.last} ${randomUUID().slice(0, 6)}`;

  try {
    const account = await whop().companies.create({
      title,
      country: country as never,
      parent_company_id: env.WHOP_PLATFORM_ACCOUNT_ID,
      email: demoEmail(env.DEMO_SELLER_EMAIL, visitorRef),
      send_customer_emails: false,
      metadata: { visitor_ref: visitorRef },
    });

    await writeState({ accountId: account.id });

    return NextResponse.json({ accountId: account.id, title, reused: false });
  } catch (error) {
    console.error("demo_account_create_failed", error);
    return NextResponse.json(
      { error: whopMessage(error) ?? "Could not make an account to verify" },
      { status: 502 },
    );
  }
}

function whopMessage(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const shape = error as { error?: { error?: { message?: unknown } } };
  const message = shape.error?.error?.message;
  return typeof message === "string" ? message : null;
}
