"use server";

import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";
import { getCurrentUserId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const IS_SANDBOX = process.env.NEXT_PUBLIC_WHOP_ENV === "sandbox";

export type EnableEarningsResult = {
  error?: string;
  success?: boolean;
};

export async function enableEarnings(): Promise<EnableEarningsResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  const creator = await prisma.creator.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!creator) return { error: "Create a profile first" };

  // Already enrolled. Re-generate the onboarding link in case they need to finish KYC.
  let companyId = creator.whopCompanyId;

  if (!companyId) {
    if (!creator.user.email) {
      return {
        error:
          "Your Whop account has no email address. Please add one at whop.com/settings before enabling earnings.",
      };
    }

    // Create a connected account company under the platform
    const company = await whop.companies.create({
      title: creator.title || creator.handle,
      parent_company_id: process.env.WHOP_PARENT_COMPANY_ID!,
      email: creator.user.email,
    });

    companyId = company.id;

    await prisma.creator.update({
      where: { id: creator.id },
      data: { whopCompanyId: companyId },
    });
  }

  // Sandbox bypass: skip Whop's hosted KYC flow and mark the creator as
  // payout-ready immediately. Whop's sandbox doesn't enforce real KYC, so the
  // hosted onboarding screen would just auto-complete with placeholder data
  // anyway. The client-side button confirms this with a popup before calling.
  if (IS_SANDBOX) {
    if (!creator.payoutEnabled) {
      await prisma.creator.update({
        where: { id: creator.id },
        data: { payoutEnabled: true },
      });
    }
    revalidatePath("/dashboard");
    return { success: true };
  }

  // Production flow: send the creator to Whop's hosted KYC onboarding.
  const accountLink = await whop.accountLinks.create({
    company_id: companyId,
    use_case: "account_onboarding",
    return_url: `${APP_URL}/api/earnings/complete`,
    refresh_url: `${APP_URL}/dashboard?refresh=true`,
  });

  redirect(accountLink.url);
}
