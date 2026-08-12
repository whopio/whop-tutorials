import { z } from "zod";
import { NotFoundError } from "@whop/sdk";
import { WHOP_IDS } from "@/constants/whop-ids";
import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";

const bodySchema = z.object({
  receiptId: z.string().regex(/^pay_[A-Za-z0-9]{4,60}$/),
});

// Server-side receipt verification for step 3: the embed's onComplete hands
// the client a pay_ id, and only payments.retrieve decides what it's worth.
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_receipt" }, { status: 400 });
  }

  let payment;
  try {
    payment = await getWhop().payments.retrieve(parsed.data.receiptId);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      // Right after checkout the payment can take a moment to become
      // readable. The client treats 404 as "try again shortly".
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }

  // Only receipts for this demo's product count.
  if (payment.product?.id !== WHOP_IDS.productId) {
    return Response.json({ error: "wrong_product" }, { status: 403 });
  }

  if (payment.status === "pending" || payment.status === "open") {
    return Response.json({ status: "pending" }, { status: 202 });
  }
  if (payment.status !== "paid") {
    return Response.json({ error: "not_paid" }, { status: 403 });
  }

  const session = await getSession();
  session.receiptId = payment.id;
  session.membershipId = payment.membership?.id;
  session.cardLast4 = payment.payment_method?.card?.last4 ?? undefined;
  session.refundedAt = payment.substatus?.includes("refund")
    ? Date.now()
    : undefined;
  await session.save();

  return Response.json({
    ok: true,
    receipt: {
      id: payment.id,
      status: payment.status,
      substatus: payment.substatus,
      total: payment.total,
      currency: payment.currency,
      paidAt: payment.paid_at,
      cardBrand: payment.payment_method?.card?.brand ?? null,
      cardLast4: payment.payment_method?.card?.last4 ?? null,
      membershipId: payment.membership?.id ?? null,
    },
  });
}
