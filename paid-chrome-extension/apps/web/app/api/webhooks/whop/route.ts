import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;
  const apiKey = process.env.WHOP_API_KEY;

  if (!webhookSecret || !apiKey) {
    return new Response("Webhook verification is not configured", { status: 501 });
  }

  try {
    const { Whop } = await import("@whop/sdk");
    const whop = new Whop({
      apiKey,
      webhookKey: Buffer.from(webhookSecret).toString("base64")
    });

    const requestBodyText = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    const webhookData = whop.webhooks.unwrap(requestBodyText, { headers });

    // In a database-backed app, enqueue this event and dedupe by the webhook id.
    const webhookId =
      request.headers.get("webhook-id") ||
      request.headers.get("svix-id") ||
      request.headers.get("x-webhook-id") ||
      "unknown";
    console.info("[WHOP WEBHOOK]", {
      id: webhookId,
      type: webhookData.type
    });

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error(
      "[WHOP WEBHOOK ERROR]",
      error instanceof Error ? error.message : "Invalid webhook"
    );
    return new Response("Invalid webhook", { status: 400 });
  }
}
