import { NextResponse } from "next/server";
import { z } from "zod";
import { whop } from "@/lib/whop";
import { getEnv } from "@/lib/env";
import { getVisitorId } from "@/lib/session";
import { readState, writeState } from "@/lib/store";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { SELLER_COUNTRIES } from "@/constants/whop-ids";

const countryCodes = SELLER_COUNTRIES.map((c) => c.code);

const body = z.object({
  title: z.string().min(1).max(60),
  country: z.enum(countryCodes as [string, ...string[]]),
});

// A real marketplace already knows its seller's email address. This demo does
// not, and Whop rejects any address that does not really accept mail, so it
// plus-tags one mailbox we own.
function demoEmail(base: string, sellerRef: string): string {
  const [name, domain] = base.split("@");
  return `${name}+payouts-${sellerRef.slice(0, 8)}@${domain}`;
}

export async function GET() {
  const state = await readState();

  return NextResponse.json({
    sellerId: state.sellerId ?? null,
    title: state.sellerTitle ?? null,
    country: state.sellerCountry ?? null,
  });
}

export async function POST(request: Request) {
  if (!checkRateLimit(clientIp(request), 5)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const env = getEnv();

  // Our own id for this seller. A marketplace has one already.
  const sellerRef = await getVisitorId();

  // No two accounts under the same platform may share a name.
  const title = `${parsed.data.title} ${sellerRef.slice(0, 4)}`;

  try {
    // There is no parent field. The company API key we call with decides that
    // this account sits underneath our platform.
    const seller = await whop().accounts.create({
      title,
      country: parsed.data.country as never,
      email: demoEmail(env.DEMO_SELLER_EMAIL, sellerRef),
      send_customer_emails: false,
      metadata: { seller_ref: sellerRef },
    });

    await writeState({
      sellerId: seller.id,
      sellerTitle: title,
      sellerCountry: parsed.data.country,
    });

    return NextResponse.json({
      sellerId: seller.id,
      title,
      country: parsed.data.country,
    });
  } catch (error) {
    console.error("seller_create_failed", error);
    return NextResponse.json(
      { error: whopMessage(error) ?? "Could not create the seller account" },
      { status: 502 },
    );
  }
}

// Whop's own wording on a rejected request is more useful than anything we
// would write, so pass it through when there is one.
function whopMessage(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const shape = error as { body?: { error?: { message?: unknown } } };
  const message = shape.body?.error?.message;
  return typeof message === "string" ? message : null;
}
