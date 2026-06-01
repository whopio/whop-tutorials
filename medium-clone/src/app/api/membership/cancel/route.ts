import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyWhop } from "@/lib/whop";

// Cancel at period end — reader keeps access until currentPeriodEnd, then expires.
// Whop will fire membership.deactivated when the period actually ends.
export async function POST() {
  const user = await requireAuth({ include: { plusMembership: true } });
  const membership = user.plusMembership;
  if (!membership) {
    return NextResponse.json({ error: "No active membership" }, { status: 400 });
  }
  await getCompanyWhop().memberships.cancel(membership.whopMembershipId, {
    cancellation_mode: "at_period_end",
  });
  await prisma.plusMembership.update({
    where: { id: membership.id },
    data: { cancelAtPeriodEnd: true },
  });
  return NextResponse.json({ ok: true });
}
