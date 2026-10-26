import { NextResponse } from "next/server";
import { unwrapWebhook } from "@whop/sdk/helpers";
import { getEnv } from "@/lib/env";

type WithdrawalEvent = {
  id: string;
  type: string;
  data: { id: string; status: string };
};

// Whop retries a delivery it did not hear back from, so the same event arrives
// more than once. A real app would dedupe against its own database. This demo
// has no database, so it keeps the last few ids in memory, which is enough to
// show the shape of the check.
const seen = new Set<string>();

export async function POST(request: Request) {
  if (!getEnv().WHOP_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "webhook secret is not configured" }, { status: 500 });
  }

  const raw = await request.text();
  // unwrapWebhook wants a plain record, not a Headers.
  const headers = Object.fromEntries(request.headers.entries());

  let event: WithdrawalEvent;
  try {
    // The ws_ secret goes in exactly as Whop shows it. The helper encodes it
    // itself, so encoding it here first makes every check fail.
    event = unwrapWebhook<WithdrawalEvent>(raw, {
      headers,
      key: getEnv().WHOP_WEBHOOK_SECRET,
    });
  } catch (error) {
    console.error("webhook_signature_failed", error);
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  // The event name is on type, not event. New webhooks send payout events,
  // older ones still send the withdrawal events, so we accept both.
  if (!event.type?.startsWith("payout.") && !event.type?.startsWith("withdrawal.")) {
    return NextResponse.json({ received: true, outcome: "ignored" });
  }

  // The delivery id is a header, not a field on the payload.
  const deliveryId = headers["webhook-id"] ?? event.id;
  if (seen.has(deliveryId)) {
    return NextResponse.json({ received: true, outcome: "duplicate" });
  }
  seen.add(deliveryId);
  if (seen.size > 200) seen.delete(seen.values().next().value as string);

  // Vercel's runtime log shows only the first console line per invocation, so
  // say everything in one.
  console.log(
    JSON.stringify({
      at: "payout_webhook",
      type: event.type,
      payout: event.data.id,
      status: event.data.status,
    }),
  );

  return NextResponse.json({ received: true, outcome: "applied" });
}
