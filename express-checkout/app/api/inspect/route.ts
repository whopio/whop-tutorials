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

  const payment = await getWhop().payments.retrieve(paymentId);

  return Response.json({
    payment: {
      id: payment.id,
      status: payment.status,
      substatus: payment.substatus,
      total: payment.total,
      currency: payment.currency,
      paid_at: payment.paid_at,
      payment_method: payment.payment_method
        ? {
            id: payment.payment_method.id,
            payment_method_type: payment.payment_method.payment_method_type,
            card: payment.payment_method.card
              ? {
                  brand: payment.payment_method.card.brand,
                  last4: payment.payment_method.card.last4,
                }
              : null,
          }
        : null,
      membership: payment.membership
        ? { id: payment.membership.id, status: payment.membership.status }
        : null,
      plan: payment.plan ? { id: payment.plan.id } : null,
      product: payment.product
        ? { id: payment.product.id, title: payment.product.title }
        : null,
      user: "(omitted: buyer identity stays private in this demo)",
    },
  });
}
