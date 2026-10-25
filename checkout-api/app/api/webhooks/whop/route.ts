import { NextResponse } from "next/server";
import { unwrapWebhook } from "@whop/sdk/helpers";
import { getEnv } from "@/lib/env";
import { fulfil, type WhopWebhookEvent } from "@/lib/fulfil";

export async function POST(request: Request) {
  const secret = getEnv().WHOP_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "webhook secret is not configured" }, { status: 500 });
  }

  const raw = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  let event: WhopWebhookEvent;

  try {
    event = unwrapWebhook<WhopWebhookEvent>(raw, { headers, key: secret });
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const deliveryId = headers["webhook-id"] ?? event.id;
  const result = await fulfil(event, deliveryId);

  return NextResponse.json({ received: true, outcome: result.outcome });
}
