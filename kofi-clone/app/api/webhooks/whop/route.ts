import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop";
import { prisma } from "@/lib/prisma";
import {
  fulfillFromMetadata,
  activateMembership,
  deactivateMembership,
  markSupportRefunded,
} from "@/lib/fulfillment";

type WebhookEvent = { id?: string; type: string; data: Record<string, unknown> };

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const headers = Object.fromEntries(req.headers);

  let event: WebhookEvent;
  try {
    event = whopsdk.webhooks.unwrap(bodyText, { headers }) as unknown as WebhookEvent;
  } catch (err: unknown) {
    console.error("Webhook signature verification failed:", err);
    return new NextResponse("invalid signature", { status: 401 });
  }

  // Idempotency: dedupe on the event id (Standard Webhooks `webhook-id`).
  const eventId = event.id ?? headers["webhook-id"];
  if (eventId) {
    const seen = await prisma.processedWebhook.findUnique({ where: { id: eventId } }).catch(() => null);
    if (seen) return new NextResponse("ok", { status: 200 });
    await prisma.processedWebhook.create({ data: { id: eventId, type: event.type } }).catch(() => {});
  }

  try {
    const data = event.data;
    switch (event.type) {
      case "payment.succeeded": {
        const id = String(data.id ?? "");
        const metadata = (data.metadata ?? null) as Record<string, unknown> | null;
        if (id) await fulfillFromMetadata(metadata, id);
        break;
      }
      case "membership.activated": {
        const meta = (data.metadata ?? {}) as Record<string, unknown>;
        if (
          typeof meta.creatorId === "string" &&
          typeof meta.userId === "string" &&
          typeof meta.tierId === "string"
        ) {
          await activateMembership({
            creatorId: meta.creatorId,
            userId: meta.userId,
            tierId: meta.tierId,
            whopMembershipId: String(data.id ?? ""),
          });
        }
        break;
      }
      case "membership.deactivated": {
        const id = String(data.id ?? "");
        if (id) await deactivateMembership(id);
        break;
      }
      case "refund.created": {
        const paymentId = String(data.payment_id ?? (data.payment as { id?: string } | undefined)?.id ?? "");
        if (paymentId) await markSupportRefunded(paymentId);
        break;
      }
      default:
        break;
    }
  } catch (err: unknown) {
    console.error(`Webhook handler error for ${event.type}:`, err);
  }

  return new NextResponse("ok", { status: 200 });
}
