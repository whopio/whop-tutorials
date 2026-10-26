import { unwrapWebhook } from "@whop/sdk/helpers";
import { getEnv } from "@/lib/env";

type WhopWebhookEvent = {
  id: string;
  type: string;
  data: { id: string };
};

export async function POST(request: Request) {
  const env = getEnv();
  if (!env.WHOP_WEBHOOK_SECRET) {
    return new Response("Webhook secret not configured", { status: 503 });
  }

  const bodyText = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event: WhopWebhookEvent;
  try {
    event = unwrapWebhook<WhopWebhookEvent>(bodyText, {
      headers,
      key: env.WHOP_WEBHOOK_SECRET,
    });
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  switch (event.type) {
    case "payment.succeeded":
      console.error("[whop] payment.succeeded", event.data.id);
      break;
    case "payment.failed":
      console.error("[whop] payment.failed", event.data.id);
      break;
    case "refund.created":
      console.error("[whop] refund.created", event.data.id);
      break;
    default:
      console.error("[whop] event", event.type, event.id);
  }

  return new Response("OK", { status: 200 });
}
