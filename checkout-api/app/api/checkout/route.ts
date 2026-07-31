import { NextResponse } from "next/server";
import { whop } from "@/lib/whop";
import { currentUserId } from "@/lib/auth";
import { createOrder } from "@/lib/orders";
import { WHOP_IDS } from "@/constants/whop-ids";

export async function POST() {
  const userId = await currentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const order = createOrder(userId);

  const checkout = await whop().checkoutConfigurations.create(
    {
      plan_id: WHOP_IDS.planId,
      mode: "payment",
      metadata: { order_id: order.id },
    },
    { headers: { "Idempotency-Key": `checkout-${order.id}` } },
  );

  return NextResponse.json({ orderId: order.id, sessionId: checkout.id });
}
