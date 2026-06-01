import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyWhop } from "@/lib/whop";

export async function POST() {
  const user = await requireAuth({ include: { plusMembership: true } });
  const membership = user.plusMembership;
  if (!membership) {
    return NextResponse.json({ error: "No membership to resume" }, { status: 400 });
  }
  await getCompanyWhop().memberships.resume(membership.whopMembershipId);
  await prisma.plusMembership.update({
    where: { id: membership.id },
    data: { status: "ACTIVE" },
  });
  return NextResponse.json({ ok: true });
}
