import { WhopError } from "@whop/sdk";
import { WHOP_IDS } from "@/constants/whop-ids";
import { getEnv } from "@/lib/env";
import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";

// Step 5: refund the payment held in the demo session. The receipt is
// re-validated against this demo's company and product before any money
// (fake money, this is the sandbox) moves back.
export async function POST() {
  const session = await getSession();
  if (!session.receiptId) {
    return Response.json({ error: "no_receipt" }, { status: 400 });
  }

  const whop = getWhop();
  const payment = await whop.payments.retrieve({ id: session.receiptId });

  if (
    payment.account_id !== getEnv().WHOP_COMPANY_ID ||
    payment.product_id !== WHOP_IDS.productId
  ) {
    return Response.json({ error: "wrong_product" }, { status: 403 });
  }
  if (
    payment.substatus === "refunded" ||
    Number(payment.refunded_amount?.amount ?? 0) > 0
  ) {
    return Response.json({ error: "already_refunded" }, { status: 409 });
  }

  try {
    await whop.payments.refund({ id: payment.id });
  } catch (error: unknown) {
    // Whop answers a repeat refund with a 400; surface it as the same
    // graceful "already refunded" state instead of a server error.
    if (error instanceof WhopError && error.statusCode === 400) {
      return Response.json({ error: "already_refunded" }, { status: 409 });
    }
    throw error;
  }

  // The refund settles asynchronously; re-read so the panel can show the
  // updated substatus (or "processing" if Whop hasn't flipped it yet).
  const after = await whop.payments.retrieve({ id: payment.id });
  session.refundedAt = Date.now();
  await session.save();

  // The payment only carries the membership id now, so read the membership
  // itself to show that a refund leaves access in place.
  let membershipStatus: string | null = null;
  if (after.membership_id) {
    try {
      const membership = await whop.memberships.retrieve({
        id: after.membership_id,
      });
      membershipStatus = membership.status;
    } catch {
      // The panel hides the membership note when it can't be read.
    }
  }

  return Response.json({
    ok: true,
    refund: {
      id: after.id,
      status: after.status,
      substatus: after.substatus,
      refundedAmount: Number(after.refunded_amount?.amount ?? 0),
      refundedAt: after.refunded_at,
      refundable: after.refundable,
      membershipId: after.membership_id,
      membershipStatus,
    },
  });
}
