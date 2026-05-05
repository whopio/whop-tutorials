import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";

// Mints a short-lived access token scoped to the creator's connected company.
// Only the authenticated creator can call this for their own company.
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creator = await prisma.creator.findUnique({ where: { userId } });
  if (!creator?.whopCompanyId) {
    return NextResponse.json({ error: "No connected account" }, { status: 400 });
  }

  const token = await whop.accessTokens.create({
    company_id: creator.whopCompanyId,
  });

  return NextResponse.json({ token: token.token });
}
