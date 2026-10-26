import type { NextRequest } from "next/server";
import { unwrapWebhook } from "@whop/sdk/helpers";
import { processWebhookEvent } from "@/lib/webhooks";
import { env } from "@/lib/env";

/**
 * PLATFORM-1/3: verify every inbound Whop webhook before trusting it, then hand
 * off to the idempotent dispatcher. We read the RAW body text (not parsed JSON)
 * because the signature is computed over the exact bytes. Return 2xx fast.
 */
export async function POST(request: NextRequest): Promise<Response> {
  // Refuse to process until the signing secret is configured, so we never run
  // verification against a blank key.
  if (!env.WHOP_WEBHOOK_SECRET) {
    return new Response("webhook not configured", { status: 503 });
  }
  const bodyText = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event: { type: string; id: string; data: unknown };
  try {
    // The raw ws_ secret, as Whop shows it. The helper base64-encodes it itself.
    event = unwrapWebhook(bodyText, {
      headers,
      key: env.WHOP_WEBHOOK_SECRET,
    }) as typeof event;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("invalid signature", { status: 401 });
  }

  try {
    await processWebhookEvent({
      type: event.type,
      id: event.id,
      data: (event.data ?? {}) as Record<string, unknown>,
    });
  } catch (err) {
    console.error("Webhook processing failed:", err);
    // Return 5xx so Whop RETRIES. The WebhookEvent id is recorded only after a
    // handler fully succeeds, so a failed delivery was never marked processed and
    // reprocessing is idempotent. Swallowing with 200 would permanently drop the
    // entitlement/ledger write on a transient DB blip.
    return new Response("processing failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
