import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL as string));
  }

  const artist = await prisma.artist.findUnique({ where: { userId } });
  if (artist?.whopCompanyId) {
    await prisma.artist.update({
      where: { id: artist.id },
      data: { payoutEnabled: true },
    });
  }

  return NextResponse.redirect(
    new URL("/dashboard?enrolled=true", process.env.NEXT_PUBLIC_APP_URL as string)
  );
}
