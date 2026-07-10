import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { whopCompany } from "@/lib/whop";

/**
 * PAYOUTS-3/5: mint a short-lived access token scoped to the signed-in creator's
 * connected company for the embedded payout portal. Never returns the platform
 * API key — only the scoped token.
 */
export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const channel = await prisma.channel.findUnique({
    where: { userId: user.id },
    select: { whopCompanyId: true },
  });
  if (!channel?.whopCompanyId) {
    return NextResponse.json({ error: "no connected account" }, { status: 400 });
  }

  try {
    const res = await whopCompany.accessTokens.create({
      company_id: channel.whopCompanyId,
    });
    return NextResponse.json({ token: res.token });
  } catch (err) {
    console.error("accessTokens.create failed:", err);
    return NextResponse.json({ error: "token failed" }, { status: 500 });
  }
}
