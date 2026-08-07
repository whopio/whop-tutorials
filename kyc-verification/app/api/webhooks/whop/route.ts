import { NextResponse } from "next/server";
import { whop } from "@/lib/whop";
import { getEnv } from "@/lib/env";
import { markDelivered } from "@/lib/store";

type IdentityProfileEvent = {
  id: string;
  type: string;
  data: { id?: string; status?: string };
};

export async function POST(request: Request) {
  if (!getEnv().WHOP_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "webhook secret is not configured" },
      { status: 500 },
    );
  }

  // The signature covers the bytes that arrived. Parsing first and
  // re-serialising changes them, and then the check fails on a good delivery.
  const raw = await request.text();
  // unwrap wants a plain record inside an options object, not a Headers.
  const headers = Object.fromEntries(request.headers.entries());

  let event: IdentityProfileEvent;
  try {
    event = whop().webhooks.unwrap(raw, { headers }) as unknown as IdentityProfileEvent;
  } catch (error) {
    console.error("webhook_signature_failed", error);
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  // The event name is on type, not event.
  if (!event.type?.startsWith("identity_profile.")) {
    return NextResponse.json({ received: true, outcome: "ignored" });
  }

  // Delivery is at least once, so the id is what makes a redelivery a no-op.
  if (!markDelivered(headers["webhook-id"] ?? event.id)) {
    return NextResponse.json({ received: true, outcome: "duplicate" });
  }

  // Nothing here writes a status. A webhook says something changed, not what
  // is now true, so the page re-reads the record instead. Vercel's runtime log
  // shows only the first console line per invocation, so say it all in one.
  console.log(
    JSON.stringify({
      at: "identity_webhook",
      type: event.type,
      profile: event.data?.id,
      status: event.data?.status,
      delivery: headers["webhook-id"],
    }),
  );

  return NextResponse.json({ received: true, outcome: "applied" });
}
