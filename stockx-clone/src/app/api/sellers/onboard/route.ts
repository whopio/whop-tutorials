import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { whopsdk } from "@/lib/whop";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request);
    if (limited) return limited;

    const user = await requireAuth();

    // Check if user already has a connected account
    if (user.connectedAccountId) {
      return NextResponse.json(
        { error: "You already have a connected seller account" },
        { status: 400 }
      );
    }

    // Create connected account via Whop API
    const company = await whopsdk.companies.create({
      title: `${user.username}-seller`,
      email: user.email,
      parent_company_id: env.WHOP_COMPANY_ID,
      metadata: {
        userId: user.id,
        whopId: user.whopId,
      },
    });

    if (!company || !company.id) {
      throw new Error("Failed to create connected account");
    }

    const connectedAccountId = company.id;

    // Generate KYC onboarding link
    const accountLink = await whopsdk.accountLinks.create({
      company_id: connectedAccountId,
      return_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard?onboarding=complete`,
      refresh_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard?onboarding=refresh`,
      use_case: "account_onboarding",
    });

    if (!accountLink || !accountLink.url) {
      throw new Error("Failed to create onboarding link");
    }

    // Update user record with connected account ID
    await prisma.user.update({
      where: { id: user.id },
      data: {
        connectedAccountId,
        role: UserRole.SELLER,
      },
    });

    return NextResponse.json({
      onboardingUrl: accountLink.url,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Seller onboarding failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
