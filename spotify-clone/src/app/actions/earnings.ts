"use server";

import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";

export async function enableEarnings(): Promise<{ message: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { message: "Not authenticated" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { creator: true },
  });

  const artist = user?.creator;
  if (!artist) return { message: "Create a profile first" };

  let companyId = artist.whopCompanyId;

  if (!companyId) {
    if (!user.email) return { message: "No email on account" };

    const suffix = Math.random().toString(36).slice(2, 6);
    const company = await whop.companies.create({
      title: `${artist.displayName || artist.handle}-${suffix}`,
      parent_company_id: process.env.WHOP_PARENT_COMPANY_ID as string,
      email: user.email,
    });
    companyId = company.id;

    await prisma.artist.update({
      where: { id: artist.id },
      data: { whopCompanyId: companyId },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL as string;
  const accountLink = await whop.accountLinks.create({
    company_id: companyId,
    use_case: "account_onboarding",
    return_url: `${appUrl}/api/earnings/complete`,
    refresh_url: `${appUrl}/dashboard?refresh=true`,
  });

  redirect(accountLink.url);
}
