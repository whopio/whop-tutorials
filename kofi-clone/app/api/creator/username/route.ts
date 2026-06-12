import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { checkUsernameFormat } from "@/lib/username";

export async function GET(req: NextRequest) {
  if (!rateLimit(`username:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const value = (req.nextUrl.searchParams.get("username") ?? "").toLowerCase();

  const format = checkUsernameFormat(value);
  if (!format.ok) {
    return NextResponse.json({ available: false, reason: format.reason });
  }

  const existing = await prisma.creator.findUnique({
    where: { username: value },
    select: { id: true },
  });

  return NextResponse.json(
    existing ? { available: false, reason: "That username is taken" } : { available: true },
  );
}
