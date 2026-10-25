import { NextResponse } from "next/server";
import { z } from "zod";
import { whop } from "@/lib/whop";
import { WHOP_IDS } from "@/constants/whop-ids";

const bodySchema = z.object({
  paymentId: z.string().startsWith("pay_"),
});

// Demo chrome. Elements hands the browser a payment id when the payment
// finishes. A browser can claim anything, so we ask Whop what that payment
// actually is before believing it.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "missing_payment" }, { status: 400 });
  }

  let payment;

  try {
    payment = await whop().payments.retrieve({ id: parsed.data.paymentId });
  } catch {
    // A payment is not always readable the instant the element reports it.
    return NextResponse.json({ error: "not_readable_yet" }, { status: 202 });
  }

  if (payment.plan_id !== WHOP_IDS.planId) {
    return NextResponse.json({ error: "wrong_product" }, { status: 400 });
  }

  if (payment.substatus !== "succeeded") {
    return NextResponse.json(
      { error: "not_paid", substatus: payment.substatus },
      { status: 202 },
    );
  }

  return NextResponse.json({
    receipt: {
      id: payment.id,
      status: payment.status,
      substatus: payment.substatus ?? null,
      total: payment.total?.amount ?? null,
      currency: payment.total?.currency ?? "usd",
      metadata: payment.metadata ?? null,
      planId: payment.plan_id ?? null,
      cardBrand: payment.payment_instrument?.card?.brand ?? null,
      cardLast4: payment.payment_instrument?.card?.last4 ?? null,
    },
  });
}
