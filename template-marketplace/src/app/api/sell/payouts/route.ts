import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { appUrl, whopCompany } from "@/lib/whop";

export async function POST() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
  });
  if (!seller) {
    return NextResponse.json({ error: "Not a seller" }, { status: 403 });
  }

  try {
    const accountLink = await whopCompany.accountLinks.create({
      company_id: seller.whopCompanyId,
      use_case: "payouts_portal",
      return_url: `${appUrl}/sell/dashboard`,
      refresh_url: `${appUrl}/sell/dashboard?refresh=true`,
    });
    return NextResponse.json({ url: accountLink.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Payouts portal link failed", { message });
    return NextResponse.json(
      { error: "Couldn't generate payouts link", detail: message.slice(0, 500) },
      { status: 500 },
    );
  }
}
