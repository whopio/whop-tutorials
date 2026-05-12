import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const artist = await prisma.artist.findUnique({ where: { userId } });
  if (!artist?.whopCompanyId) {
    return NextResponse.json({ error: "Earnings not enabled" }, { status: 400 });
  }

  const token = await whop.accessTokens.create({
    company_id: artist.whopCompanyId,
  });

  return NextResponse.json({ token: token.token });
}
