import { z } from "zod";
import { Whop } from "@whop/sdk";
import { posts } from "@/constants/posts";
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
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }

  const env = getEnv();
  const knownProductIds = new Set(
    [env.WHOP_PRO_PRODUCT_ID, ...posts.map((post) => post.productId)].filter(
      (id): id is string => Boolean(id),
    ),
  );
  if (!payment.product_id || !knownProductIds.has(payment.product_id)) {
    return Response.json({ error: "wrong_product" }, { status: 403 });
  }

  if (payment.status === "pending" || payment.status === "open") {
    return Response.json({ status: "pending" }, { status: 202 });
  }

  if (payment.status !== "paid" || payment.substatus?.includes("refund")) {
    return Response.json({ error: "not_paid" }, { status: 403 });
  }

  if (!payment.user?.id) {
    return Response.json({ error: "no_user" }, { status: 502 });
  }

  const session = await getSession();
  session.whopUserId = payment.user.id;
  session.username = payment.user.username;
  session.unlockedAt = Date.now();
  await session.save();

  return Response.json({ ok: true, username: payment.user.username });
}
