// src/app/api/sell/onboard/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";
import { generateUsername } from "@/lib/utils";
import { env } from "@/lib/env";

const isSandbox = process.env.WHOP_SANDBOX === "true";

export async function POST() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { sellerProfile: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Already a seller with completed KYC — go to dashboard
  if (user.sellerProfile?.kycComplete) {
    return NextResponse.json({ redirect: "/sell/dashboard" });
  }

  // Started onboarding but didn't finish KYC
  if (user.sellerProfile) {
    if (isSandbox) {
      await prisma.sellerProfile.update({
        where: { id: user.sellerProfile.id },
        data: { kycComplete: true },
      });
      return NextResponse.json({ sandbox: true });
    }

    const accountLink = await getWhop().accountLinks.create({
      company_id: user.sellerProfile.whopCompanyId,
      use_case: "account_onboarding",
      return_url: `${env.NEXT_PUBLIC_APP_URL}/sell/kyc-return`,
      refresh_url: `${env.NEXT_PUBLIC_APP_URL}/sell?refresh=true`,
    });

    return NextResponse.json({ redirect: accountLink.url });
  }

  // New seller — create connected account on Whop
  const company = await getWhop().companies.create({
    email: user.email,
    title: `${user.name || "Seller"}'s Store`,
    parent_company_id: env.WHOP_COMPANY_ID,
  });

  // Create SellerProfile with a unique username
  const username = generateUsername(user.name);

  if (isSandbox) {
    await prisma.sellerProfile.create({
      data: {
        userId: user.id,
        username,
        whopCompanyId: company.id,
        kycComplete: true,
      },
    });
    return NextResponse.json({ sandbox: true });
  }

  await prisma.sellerProfile.create({
    data: {
      userId: user.id,
      username,
      whopCompanyId: company.id,
      kycComplete: false,
    },
  });

  // Generate KYC onboarding link
  const accountLink = await getWhop().accountLinks.create({
    company_id: company.id,
    use_case: "account_onboarding",
    return_url: `${env.NEXT_PUBLIC_APP_URL}/sell/kyc-return`,
    refresh_url: `${env.NEXT_PUBLIC_APP_URL}/sell?refresh=true`,
  });

  return NextResponse.json({ redirect: accountLink.url });
}
