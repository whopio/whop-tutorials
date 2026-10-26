import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { env } from "@/lib/env";

export async function POST(_request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (session.userId) {
    await prisma.user.update({
      where: { id: session.userId },
      data: { plan: "free", planType: null, planSince: null },
    });
  }
  session.destroy();
  return NextResponse.redirect(new URL("/", env.NEXT_PUBLIC_APP_URL), {
    status: 303,
  });
}
