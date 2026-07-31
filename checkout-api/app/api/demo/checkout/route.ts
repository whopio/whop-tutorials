import { NextResponse } from "next/server";
import { z } from "zod";
import { whop } from "@/lib/whop";
import { getEnv } from "@/lib/env";
import { WHOP_IDS } from "@/constants/whop-ids";

// Demo chrome. The order id comes from the browser and is never stored. That
// is the point of the walkthrough: we hand it to Whop on the way in and read
// it back off the payment on the way out.
const bodySchema = z.object({
  orderId: z.string().min(8).max(64),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "bad order id" }, { status: 400 });
  }

  const { orderId } = parsed.data;
  const env = getEnv();

  const redirectUrl = env.APP_URL.startsWith("https://")
    ? `${env.APP_URL}/?returned=1&order_id=${orderId}`
    : undefined;

  const started = Date.now();

  const configuration = await whop().checkoutConfigurations.create(
    {
      plan_id: WHOP_IDS.planId,
      mode: "payment",
      metadata: { order_id: orderId },
      ...(redirectUrl ? { redirect_url: redirectUrl } : {}),
    },
    { headers: { "Idempotency-Key": `demo-${orderId}` } },
  );

  return NextResponse.json({
    id: configuration.id,
    purchaseUrl: configuration.purchase_url,
    metadata: configuration.metadata ?? null,
    redirectUrl: configuration.redirect_url ?? null,
    tookMs: Date.now() - started,
  });
}
