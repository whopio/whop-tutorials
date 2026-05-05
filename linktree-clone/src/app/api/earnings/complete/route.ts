import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.redirect(`${APP_URL}/`);

  const creator = await prisma.creator.findUnique({ where: { userId } });

  if (!creator?.whopCompanyId) {
    return NextResponse.redirect(`${APP_URL}/dashboard`);
  }

  // Verify KYC completion against Whop before flipping the flag.
  // A logged-in user could otherwise hit this route directly and unlock
  // payouts without ever going through onboarding.
  let payoutReady = false;
  try {
    const methods = await whop.payoutMethods.list({
      company_id: creator.whopCompanyId,
    });
    for await (const method of methods) {
      if (method.destination) {
        payoutReady = true;
        break;
      }
    }
  } catch (err) {
    console.error("[earnings/complete] payout-methods lookup failed:", err);
  }

  if (payoutReady && !creator.payoutEnabled) {
    await prisma.creator.update({
      where: { userId },
      data: { payoutEnabled: true },
    });
  }

  const status = payoutReady ? "enrolled=true" : "kyc_incomplete=true";
  return NextResponse.redirect(`${APP_URL}/dashboard?${status}`);
}
