import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isDemoMode } from "@/lib/demo";
import { whop } from "@/lib/whop";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await requireAuth({ redirect: false });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limited = rateLimit(`kyc:${user.id}`, {
    interval: 60_000,
    maxRequests: 5,
  });
  if (limited) return limited;

  const writer = await prisma.writer.findUnique({
    where: { id },
    include: { user: { select: { email: true } } },
  });
  if (!writer) {
    return NextResponse.json({ error: "Writer not found" }, { status: 404 });
  }
  if (writer.userId !== user.id) {
    return NextResponse.json(
      { error: "Not your publication" },
      { status: 403 }
    );
  }

  if (writer.kycCompleted) {
    return NextResponse.json({ error: "KYC already completed" }, { status: 409 });
  }

  // Demo mode: skip real KYC
  if (isDemoMode()) {
    await prisma.writer.update({
      where: { id },
      data: { kycCompleted: true },
    });
    return NextResponse.json({ success: true, demo: true });
  }

  // Real mode: create Whop connected account (company under our platform)
  try {
    let companyId = writer.whopCompanyId;

    if (!companyId) {
      const company = await whop.companies.create({
        title: writer.name,
        parent_company_id: process.env.WHOP_COMPANY_ID!,
        email: writer.user.email,
      });

      companyId = company.id;

      await prisma.writer.update({
        where: { id },
        data: { whopCompanyId: companyId },
      });
    }

    const accountLink = await whop.accountLinks.create({
      company_id: companyId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
      use_case: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    console.error("KYC Whop SDK error:", err);
    const message = err instanceof Error ? err.message : "Whop API error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
