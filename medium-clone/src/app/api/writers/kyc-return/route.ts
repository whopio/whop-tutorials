import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Marks the writer as KYC-complete after they return from Whop's hosted onboarding flow.
 * Note: production should verify KYC status via the Whop API (ledgerAccounts.retrieve
 * gives `payments_approval_status`) before flipping the flag. v1 trusts the round-trip
 * — same pattern as Shelfie / Penstack.
 */
export async function POST() {
  const user = await requireAuth({ include: { writerProfile: true } });
  if (!user.writerProfile) {
    return NextResponse.json({ error: "No writer profile" }, { status: 400 });
  }
  await prisma.writerProfile.update({
    where: { id: user.writerProfile.id },
    data: { kycComplete: true, tippingEnabled: true },
  });
  return NextResponse.json({ ok: true });
}
