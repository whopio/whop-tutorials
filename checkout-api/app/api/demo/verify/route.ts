import { NextResponse } from "next/server";
import { z } from "zod";
import { whop } from "@/lib/whop";
import { WHOP_IDS } from "@/constants/whop-ids";

const bodySchema = z.object({
  receiptId: z.string().min(3),
});

// Demo chrome. The embed hands the browser a receipt id when the payment
// finishes. A browser can claim anything, so we ask Whop what that receipt
// actually is before believing it.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "missing_receipt" }, { status: 400 });
  }

  let payment;

  try {
    payment = await whop().payments.retrieve(parsed.data.receiptId);
  } catch {
    // A payment is not always readable the instant the embed reports it.
    return NextResponse.json({ error: "not_readable_yet" }, { status: 202 });
  }

  if (payment.plan?.id && payment.plan.id !== WHOP_IDS.planId) {
    return NextResponse.json({ error: "wrong_product" }, { status: 400 });
  }

  // Judge on substatus, not status. `status` is invoice-shaped and stays on
  // values like `open`, it never reads "paid". `substatus` is the derived
  // human-readable one and is where `succeeded` and `failed` show up.
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
      total: payment.total ?? null,
      currency: payment.currency ?? "usd",
      metadata: payment.metadata ?? null,
      planId: payment.plan?.id ?? null,
      cardBrand: payment.payment_method?.card?.brand ?? null,
      cardLast4: payment.payment_method?.card?.last4 ?? null,
    },
  });
}
