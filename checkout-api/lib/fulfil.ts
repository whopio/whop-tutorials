import { markPaid } from "@/lib/orders";
import { recordDelivery } from "@/lib/webhook-log";

export interface WhopWebhookEvent {
  type: string;
  id: string;
  data: Record<string, unknown>;
}

export type FulfilResult =
  | { outcome: "fulfilled"; orderId: string }
  | { outcome: "already_done"; orderId?: string }
  | { outcome: "ignored"; reason: string };

function readOrderId(data: Record<string, unknown>): string | undefined {
  const metadata = data.metadata;
  if (!metadata || typeof metadata !== "object") return undefined;

  const orderId = (metadata as Record<string, unknown>).order_id;
  return typeof orderId === "string" ? orderId : undefined;
}

// Replace this with what "they bought it" means in this app: flip a column,
// insert a row, send the licence key, add them to the group.
async function grantAccess(userId: string): Promise<void> {
  console.log(`granting access to ${userId}`);
}

export async function fulfil(
  event: WhopWebhookEvent,
  deliveryId: string,
): Promise<FulfilResult> {
  if (event.type !== "payment.succeeded") {
    return { outcome: "ignored", reason: `nothing to do for ${event.type}` };
  }

  const orderId = readOrderId(event.data);
  if (!orderId) {
    return { outcome: "ignored", reason: "no order_id in metadata" };
  }

  const { firstTime } = recordDelivery(deliveryId);
  if (!firstTime) {
    return { outcome: "already_done", orderId };
  }

  const paid = markPaid(orderId, typeof event.data.id === "string" ? event.data.id : "unknown");
  if (!paid) {
    return { outcome: "ignored", reason: `no order matching ${orderId}` };
  }

  await grantAccess(paid.userId);

  return { outcome: "fulfilled", orderId };
}
