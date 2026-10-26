import { after, type NextRequest } from "next/server";
import { unwrapWebhook } from "@whop/sdk/helpers";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { readReceipt } from "@/lib/payments";

const eventSchema = z.object({
  type: z.string(),
  data: z.looseObject({
    id: z.string(),
    billing_reason: z.string().nullish(),
    membership_id: z.string().nullish(),
  }),
});

// Whop signs every delivery. The raw body is what the signature covers, so it
// is read as text before anything parses it.
export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.text();

  let event: unknown;
  try {
    event = unwrapWebhook(body, {
      headers: Object.fromEntries(request.headers),
      key: getEnv().WHOP_WEBHOOK_SECRET,
    });
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  const parsed = eventSchema.safeParse(event);
  if (!parsed.success) return new Response("Ignored", { status: 200 });
  const { type, data } = parsed.data;
  const deliveryId = request.headers.get("webhook-id");

  // Whop wants an answer within five seconds, so the Whop reads happen after it.
  if (type === "payment.succeeded" && data.membership_id) {
    const membershipId = data.membership_id;
    after(async () => {
      const receipt = await readReceipt(data.id, membershipId);
      console.error(JSON.stringify({ deliveryId, type, billingReason: data.billing_reason, receipt }));
    });
  }

  if (type === "payment.failed" && data.billing_reason === "subscription_cycle") {
    console.error(JSON.stringify({ deliveryId, type, paymentId: data.id, note: "renewal failed, Whop retries the card" }));
  }

  return new Response("OK", { status: 200 });
}
