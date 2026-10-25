import { NextResponse } from "next/server";
import { z } from "zod";
import { whop } from "@/lib/whop";
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
  const started = Date.now();

  const configuration = await whop().checkoutConfigurations.create(
    {
      plan_id: WHOP_IDS.planId,
      mode: "payment",
      metadata: { order_id: orderId },
    },
    { idempotencyKey: `demo-${orderId}` },
  );

  return NextResponse.json({
    id: configuration.id,
    metadata: configuration.metadata ?? null,
    tookMs: Date.now() - started,
  });
}
