// src/app/api/sell/complete-kyc/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Called when a seller returns from Whop's KYC flow.
// Whop only redirects to the return_url after successful onboarding,
// so hitting this endpoint means KYC passed.
export async function POST() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
  });

  if (!profile) {
    return NextResponse.json({ error: "No seller profile" }, { status: 404 });
  }

  if (profile.kycComplete) {
    return NextResponse.json({ kycComplete: true });
  }

  await prisma.sellerProfile.update({
    where: { id: profile.id },
    data: { kycComplete: true },
  });

  return NextResponse.json({ kycComplete: true });
}
