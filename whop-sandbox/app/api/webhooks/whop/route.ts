import Whop from "@whop/sdk";
import { getEnv } from "@/lib/env";

// Vercel's runtime logs only surface console.error, so don't use console.log.
export async function POST(request: Request) {
  const env = getEnv();
  if (!env.WHOP_WEBHOOK_SECRET) {
    return new Response("Webhook secret not configured", { status: 503 });
  }

  const whop = new Whop({
    apiKey: env.WHOP_COMPANY_API_KEY,
    webhookKey: Buffer.from(env.WHOP_WEBHOOK_SECRET).toString("base64"),
  });

  const bodyText = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event: ReturnType<typeof whop.webhooks.unwrap>;
  try {
    event = whop.webhooks.unwrap(bodyText, { headers });
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
