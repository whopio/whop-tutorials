import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateUsername } from "@/lib/username";
import { appUrl, whopCompany } from "@/lib/whop";

export async function POST() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Idempotent: already a seller → just send them to the dashboard
  const existing = await prisma.sellerProfile.findUnique({
    where: { userId: user.id },
  });
  if (existing) {
    return NextResponse.json({ url: "/sell/dashboard" });
  }

  const isSandbox = process.env.WHOP_SANDBOX === "true";

  try {
    // Create the connected company on the platform's parent company
    const company = await whopCompany.companies.create({
      email: user.email,
      title: `${user.name ?? user.email}'s Templates`,
      parent_company_id: process.env.WHOP_COMPANY_ID!,
    });

    const username = await generateUsername(
      user.name ?? user.email.split("@")[0],
    );

    if (isSandbox) {
      await prisma.sellerProfile.create({
        data: {
          userId: user.id,
          username,
          whopCompanyId: company.id,
          kycComplete: true,
        },
      });
      return NextResponse.json({ url: "/sell/dashboard" });
    }

    // Production: create the seller in pending KYC state and hand off to
    // Whop's hosted onboarding. Completion handler is added in Part 8.
    await prisma.sellerProfile.create({
      data: {
        userId: user.id,
        username,
        whopCompanyId: company.id,
        kycComplete: false,
      },
    });

    const accountLink = await whopCompany.accountLinks.create({
      company_id: company.id,
      use_case: "account_onboarding",
      return_url: `${appUrl}/sell/onboard/complete?company_id=${company.id}`,
      refresh_url: `${appUrl}/sell?refresh=true`,
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      typeof err === "object" && err !== null && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;
    console.error("Seller onboard failed", { status, message });
    return NextResponse.json(
      { error: "Onboarding failed", detail: message.slice(0, 500), status },
      { status: 500 },
    );
  }
}
