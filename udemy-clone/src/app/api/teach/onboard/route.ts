import { NextResponse } from "next/server";
import { requireAuth, getCreatorProfile } from "@/lib/auth";
import { getWhop } from "@/lib/whop";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

const isSandbox = process.env.WHOP_SANDBOX === "true";

export async function POST() {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = rateLimit(`teach:onboard:${ip}`, {
    interval: 60_000,
    maxRequests: 5,
  });
  if (limited) return limited;

  const user = await requireAuth({ redirect: false });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await getCreatorProfile(user.id);

  if (existing) {
    if (!existing.kycComplete) {
      if (isSandbox) {
        await prisma.creatorProfile.update({
          where: { id: existing.id },
          data: { kycComplete: true },
        });
        return NextResponse.json({ sandbox: true });
      }
      const whop = getWhop();
      const accountLink = await whop.accountLinks.create({
        company_id: existing.whopCompanyId,
        use_case: "account_onboarding",
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/teach/dashboard`,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/teach?refresh=true`,
      });
      return NextResponse.json({ url: accountLink.url });
    }
    return NextResponse.json({ url: "/teach/dashboard" });
  }

  const whop = getWhop();

  const company = await whop.companies.create({
    email: user.email || undefined,
    title: `${user.name || "Instructor"}'s Teaching Account`,
    parent_company_id: process.env.WHOP_COMPANY_ID!,
  });

  if (isSandbox) {
    await prisma.creatorProfile.create({
      data: {
        userId: user.id,
        whopCompanyId: company.id,
        kycComplete: true,
      },
    });
    return NextResponse.json({ sandbox: true });
  }

  await prisma.creatorProfile.create({
    data: {
      userId: user.id,
      whopCompanyId: company.id,
      kycComplete: false,
    },
  });

  const accountLink = await whop.accountLinks.create({
    company_id: company.id,
    use_case: "account_onboarding",
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/teach/dashboard`,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/teach?refresh=true`,
  });

  return NextResponse.json({ url: accountLink.url });
}
