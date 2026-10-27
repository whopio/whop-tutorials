import { z } from "zod";
import { Whop } from "@whop/sdk";
import { WHOP_IDS } from "@/constants/whop-ids";
import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";

const bodySchema = z.object({
  receiptId: z.string().regex(/^pay_[A-Za-z0-9]{4,60}$/),
  path: z.enum(["callback", "redirect"]),
});

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_receipt" }, { status: 400 });
  }

  let payment;
  try {
    payment = await getWhop().payments.retrieve({ id: parsed.data.receiptId });
  } catch (error: unknown) {
    if (error instanceof Whop.NotFoundError) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }

  if (payment.product_id !== WHOP_IDS.productId) {
    return Response.json({ error: "wrong_product" }, { status: 403 });
  }
  if (payment.status === "pending" || payment.status === "open") {
    return Response.json({ status: "pending" }, { status: 202 });
  }
  if (payment.status !== "paid" || payment.substatus?.includes("refund")) {
    return Response.json({ error: "not_paid" }, { status: 403 });
  }

  const session = await getSession();
  if (parsed.data.path === "callback") {
    session.callbackPaymentId = payment.id;
  } else {
    session.redirectPaymentId = payment.id;
  }
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
      cardBrand: payment.payment_instrument?.card?.brand ?? null,
      cardLast4: payment.payment_instrument?.card?.last4 ?? null,
    },
  });
}
