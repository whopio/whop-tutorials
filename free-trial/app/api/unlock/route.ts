import { z } from "zod";
import { Whop } from "@whop/sdk";
import { getEnv } from "@/lib/env";
import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";

const bodySchema = z.object({
  receiptId: z.string().regex(/^pay_[A-Za-z0-9]{4,60}$/),
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
      // Right after checkout the payment can take a moment to become
      // readable. The client treats 404 as "try again shortly".
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }

  // A receipt only unlocks content if it paid for our trial product.
  if (payment.product_id !== getEnv().WHOP_PRO_PRODUCT_ID) {
    return Response.json({ error: "wrong_product" }, { status: 403 });
  }

  if (payment.status === "pending" || payment.status === "open") {
    return Response.json({ status: "pending" }, { status: 202 });
  }
  // A refunded receipt stays status "paid" but must not mint new
  // sessions. substatus covers refunded, auto_refunded, partially_refunded.
  if (payment.status !== "paid" || payment.substatus?.includes("refund")) {
    return Response.json({ error: "not_paid" }, { status: 403 });
  }

  if (!payment.user?.id) {
    return Response.json({ error: "no_user" }, { status: 502 });
  }

  const session = await getSession();
  session.whopUserId = payment.user.id;
  session.username = payment.user.username;
  session.membershipId = payment.membership_id ?? undefined;
  session.unlockedAt = Date.now();
  await session.save();

  return Response.json({ ok: true, username: payment.user.username });
}
