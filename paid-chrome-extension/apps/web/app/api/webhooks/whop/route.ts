import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return new Response("Webhook verification is not configured", { status: 501 });
  }

  try {
    const { unwrapWebhook } = await import("@whop/sdk/helpers");

    const requestBodyText = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    const webhookData = unwrapWebhook<{ type: string }>(requestBodyText, {
      headers,
      key: webhookSecret
    });

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
