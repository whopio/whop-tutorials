import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyWhop } from "@/lib/whop";

/**
 * Marks the writer as KYC-complete after they return from Whop's hosted onboarding flow,
 * but only once Whop says so. Coming back from Whop proves nothing on its own, so we read
 * the writer's payout account from Whop and turn payouts and tipping on only when its
 * status is `connected` (onboarding complete).
 */
export async function POST() {
  const user = await requireAuth({ include: { writerProfile: true } });
  if (!user.writerProfile) {
    return NextResponse.json({ error: "No writer profile" }, { status: 400 });
  }

  const ledger = await getCompanyWhop().ledgerAccounts.retrieve({
    id: user.writerProfile.whopCompanyId,
  });
  if (ledger.payout_account_details?.status !== "connected") {
    return NextResponse.json({ ok: true, kycComplete: false });
  }

  await prisma.writerProfile.update({
    where: { id: user.writerProfile.id },
    data: { kycComplete: true, tippingEnabled: true },
  });
  return NextResponse.json({ ok: true, kycComplete: true });
}
