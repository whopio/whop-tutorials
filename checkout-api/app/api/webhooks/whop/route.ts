import { NextResponse } from "next/server";
import { whop } from "@/lib/whop";
import { getEnv } from "@/lib/env";
import { fulfil, type WhopWebhookEvent } from "@/lib/fulfil";

export async function POST(request: Request) {
  if (!getEnv().WHOP_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "webhook secret is not configured" }, { status: 500 });
  }

  const raw = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  let event: WhopWebhookEvent;

  try {
    event = whop().webhooks.unwrap(raw, { headers }) as unknown as WhopWebhookEvent;
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const deliveryId = headers["webhook-id"] ?? event.id;
  const result = await fulfil(event, deliveryId);

  return NextResponse.json({ received: true, outcome: result.outcome });
}
