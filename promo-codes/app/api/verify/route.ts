import { z } from "zod";
import { Whop } from "@whop/sdk";
import { WHOP_IDS } from "@/constants/whop-ids";
import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";
import { toDisplayAmount } from "@/lib/promo";

const bodySchema = z.object({
  receiptId: z.string().regex(/^pay_[A-Za-z0-9]{4,60}$/),
});

// The embed's onComplete hands the client a pay_ id. Only the server can say
// what it was worth, and the payment carries the whole story: `subtotal` is the
// price before the discount, `total` is what was charged, and `promo_code_id`
// points at the code that did it. No need to look the plan price up separately.
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
      // Right after checkout the payment takes a moment to become readable.
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
  if (payment.status !== "paid") {
    return Response.json({ error: "not_paid" }, { status: 403 });
  }

  const session = await getSession();
  session.receiptId = payment.id;
  await session.save();

  return Response.json({ ok: true, receipt: await summarize(payment) });
}

// Money arrives as an exact decimal string in major units ("40.00"), so it is
// parsed once here and the rest of the app works with plain numbers.
function toAmount(money: Whop.Money | null) {
  return money ? Number(money.amount) : 0;
}

// Exported so the page can rebuild the same shape for a returning visitor.
export async function summarize(payment: Whop.Payment) {
  const before = toAmount(payment.subtotal);
  const paid = toAmount(payment.total);
  // The payment names its promo code by id only, so the code itself is read
  // for its string and discount. Its amount_off repeats the fraction encoding,
  // so a 25% code arrives as 0.25 and is converted like everywhere else.
  const promo = payment.promo_code_id
    ? await getWhop().promoCodes.retrieve({ id: payment.promo_code_id })
    : null;

  return {
    id: payment.id,
    status: payment.status ?? "unknown",
    before,
    paid,
    saved: Math.round((before - paid) * 100) / 100,
    promoCodeId: payment.promo_code_id,
    code: promo?.code ?? null,
    discount: promo
      ? promo.promo_type === "percentage"
        ? `${toDisplayAmount("percentage", promo.amount_off)}%`
        : `$${promo.amount_off.toFixed(2)}`
      : null,
    currency: payment.currency ?? "usd",
    paidAt: payment.paid_at ?? null,
    cardLast4: payment.payment_instrument?.card?.last4 ?? null,
  };
}
