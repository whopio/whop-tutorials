import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Whop redirects buyers here after a successful checkout. We verify the payment
// against Whop and mark the unlock as PAID. The webhook handler is the
// authoritative source for state changes; this is only the optimistic
// "they probably just paid" path that lets the buyer see their content
// immediately. Failed verifications do not flip status to FAILED. They fall
// through to the public profile page, where the webhook will catch up.
export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  const unlockId = req.nextUrl.searchParams.get("unlock_id");
  const paymentId = req.nextUrl.searchParams.get("payment_id");
  const checkoutStatus = req.nextUrl.searchParams.get("checkout_status");

  if (!handle) {
    return NextResponse.redirect(`${APP_URL}/`);
  }

  const profileUrl = `${APP_URL}/u/${handle}`;

  if (checkoutStatus !== "success" || !unlockId || !paymentId) {
    return NextResponse.redirect(profileUrl);
  }

  try {
    const payment = await whop.payments.retrieve(paymentId);
    if (payment.status === "paid") {
      const unlock = await prisma.unlock.findUnique({
        where: { id: unlockId },
        include: { creator: true },
      });

      if (unlock && unlock.creator.handle === handle) {
        await prisma.unlock.updateMany({
          where: { id: unlockId, status: "PENDING" },
          data: { status: "PAID", whopPaymentId: paymentId },
        });
      }
    }
  } catch (err) {
    // Non-fatal: the webhook is the safety net.
    console.error("[checkout/verify] payment retrieve failed:", err);
  }

  return NextResponse.redirect(`${profileUrl}?unlocked=${unlockId}`);
}
