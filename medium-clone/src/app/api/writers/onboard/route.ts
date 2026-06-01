import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyWhop } from "@/lib/whop";
import { env } from "@/lib/env";

/**
 * Creates the writer's own Whop sub-company (where all their tips and Partner-Program
 * payouts land), then either bypasses KYC in sandbox or returns a hosted KYC URL.
 *
 * Idempotent: re-running for an existing WriterProfile is safe — we return the
 * existing company and either confirm sandbox bypass or mint a fresh KYC link.
 */
export async function POST() {
  const user = await requireAuth({ include: { writerProfile: true } });
  const isSandbox = process.env.WHOP_SANDBOX === "true";
  const whop = getCompanyWhop();

  let writerCompanyId = user.writerProfile?.whopCompanyId;

  if (!writerCompanyId) {
    const company = await whop.companies.create({
      email: user.email,
      title: `${user.name ?? user.username}'s Storyline`,
      parent_company_id: env.WHOP_COMPANY_ID,
      metadata: { storyline_user_id: user.id },
    });
    writerCompanyId = company.id;

    await prisma.writerProfile.create({
      data: {
        userId: user.id,
        whopCompanyId: writerCompanyId,
        kycComplete: isSandbox,
        tippingEnabled: isSandbox,
      },
    });
  }

  if (isSandbox) {
    // Sandbox shortcut — Whop's hosted KYC isn't reachable without real ID,
    // so we mark KYC complete immediately. Production switch in Part 7 removes this branch.
    return NextResponse.json({ ok: true, kycComplete: true });
  }

  const link = await whop.accountLinks.create({
    company_id: writerCompanyId,
    use_case: "account_onboarding",
    return_url: `${env.NEXT_PUBLIC_APP_URL}/me/kyc-return`,
    refresh_url: `${env.NEXT_PUBLIC_APP_URL}/me/settings?kyc=refresh`,
  });

  return NextResponse.json({ ok: true, redirectUrl: link.url });
}
