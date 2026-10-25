import { NextResponse } from "next/server";
import { z } from "zod";
import { whop } from "@/lib/whop";
import { WHOP_IDS } from "@/constants/whop-ids";

const bodySchema = z.object({
  paymentId: z.string().startsWith("pay_"),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "missing_payment" }, { status: 400 });
  }

  let payment;

  try {
    payment = await whop().payments.retrieve({ id: parsed.data.paymentId });
  } catch {
    return NextResponse.json({ error: "not_readable_yet" }, { status: 202 });
  }

  if (payment.plan_id !== WHOP_IDS.planId) {
    return NextResponse.json({ error: "wrong_product" }, { status: 400 });
  }

  if (payment.substatus === "failed" || payment.substatus === "canceled") {
    return NextResponse.json({ error: "payment_failed" }, { status: 400 });
  }

  if (payment.substatus !== "succeeded") {
    return NextResponse.json({ error: "not_paid" }, { status: 202 });
  }

  const orderId =
    payment.metadata && typeof payment.metadata.order_id === "string"
      ? payment.metadata.order_id
      : undefined;

  return NextResponse.json({ orderId: orderId ?? null, paymentId: payment.id });
}
