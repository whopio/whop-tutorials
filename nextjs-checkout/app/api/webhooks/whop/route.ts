import { waitUntil } from "@vercel/functions";
import { NextResponse, type NextRequest } from "next/server";
import { unwrapWebhook } from "@whop/sdk/helpers";
import { env } from "@/lib/env";
import {
  handlePaymentSucceeded,
  handleMembershipDeactivated,
} from "@/lib/webhooks";

interface WhopEvent {
  type: string;
  id: string;
  data: Record<string, unknown>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const bodyText = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event: WhopEvent;
  try {
    event = unwrapWebhook<WhopEvent>(bodyText, {
      headers,
      key: env.WHOP_WEBHOOK_SECRET,
    });
  } catch (err) {
    console.error("[webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  switch (event.type) {
    case "payment.succeeded":
    case "membership.activated":
      waitUntil(handlePaymentSucceeded(event.id, event.data));
      break;
    case "membership.deactivated":
      waitUntil(handleMembershipDeactivated(event.id, event.data));
      break;
    case "payment.failed":
      console.error("[webhook] payment.failed:", event.id);
      break;
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
