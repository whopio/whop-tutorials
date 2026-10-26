import { NextResponse } from "next/server";
import { unwrapWebhook } from "@whop/sdk/helpers";
import { whop } from "@/lib/whop";
import { getEnv } from "@/lib/env";
import { markDelivered } from "@/lib/store";

type IdentityProfileEvent = {
  id: string;
  type: string;
  data: { id?: string };
};

export async function POST(request: Request) {
  const secret = getEnv().WHOP_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "webhook secret is not configured" },
      { status: 500 },
    );
  }

  const raw = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  let event: IdentityProfileEvent;
  try {
    event = unwrapWebhook<IdentityProfileEvent>(raw, { headers, key: secret });
  } catch (error) {
    console.error("webhook_signature_failed", error);
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  if (!event.type?.startsWith("identity_profile.") || !event.data?.id) {
    return NextResponse.json({ received: true, outcome: "ignored" });
  }

  // Read the record before marking the delivery, so a failed read lets Whop retry it
  let status: string | undefined;
  try {
    status = (await whop().verifications.retrieve({ id: event.data.id })).status;
  } catch (error) {
    console.error("verification_reread_failed", error);
    return NextResponse.json({ error: "could not read the check" }, { status: 502 });
  }

  if (!markDelivered(headers["webhook-id"] ?? event.id)) {
    return NextResponse.json({ received: true, outcome: "duplicate" });
  }

  console.log(
    JSON.stringify({
      at: "identity_webhook",
      type: event.type,
      profile: event.data.id,
      status,
      delivery: headers["webhook-id"],
    }),
  );

  return NextResponse.json({ received: true, outcome: "applied" });
}
