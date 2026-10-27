import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";

// Step 3: a live payments.retrieve on the held payment, trimmed to the
// fields the JSON pane teaches. Buyer identity stays out: the page is public.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const which = url.searchParams.get("which") === "redirect" ? "redirect" : "callback";

  const session = await getSession();
  const paymentId =
    which === "redirect" ? session.redirectPaymentId : session.callbackPaymentId;
  if (!paymentId) {
    return Response.json({ error: "no_receipt" }, { status: 400 });
  }

  const payment = await getWhop().payments.retrieve({ id: paymentId });

  return Response.json({
    payment: {
      id: payment.id,
      status: payment.status,
      substatus: payment.substatus,
      total: payment.total,
      currency: payment.currency,
      paid_at: payment.paid_at,
      payment_method_id: payment.payment_method_id,
      payment_instrument: payment.payment_instrument
        ? {
            payment_method_type: payment.payment_instrument.payment_method_type,
            card: payment.payment_instrument.card
              ? {
                  brand: payment.payment_instrument.card.brand,
                  last4: payment.payment_instrument.card.last4,
                }
              : null,
          }
        : null,
      membership_id: payment.membership_id,
      plan_id: payment.plan_id,
      product_id: payment.product_id,
      user: "(omitted: buyer identity stays private in this demo)",
    },
  });
}
