import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Schema = z.object({
  dwellSeconds: z.number().int().min(0).max(86_400).optional(),
});

function currentMonthBucket(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

/**
 * Records a Plus-member read of a Plus story for the Partner Program. Dedupes
 * to one row per user/story/month, so refreshing the page doesn't game payouts.
 * Returns 204 silently when the reader isn't Plus or the story isn't Plus —
 * the client doesn't need to know; we just don't count it.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getAuthUser({ include: { plusMembership: true } });
  if (!user) return new NextResponse(null, { status: 204 });

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  const dwellSeconds = parsed.success ? parsed.data.dwellSeconds : undefined;

  const story = await prisma.story.findUnique({
    where: { id },
    select: { id: true, visibility: true, status: true, authorUserId: true },
  });
  if (!story || story.status !== "PUBLISHED" || story.visibility !== "PLUS") {
    return new NextResponse(null, { status: 204 });
  }
  if (story.authorUserId === user.id) {
    // Don't count self-reads.
    return new NextResponse(null, { status: 204 });
  }
  const hasActivePlus =
    user.plusMembership?.status === "ACTIVE" &&
    user.plusMembership.currentPeriodEnd > new Date();
  if (!hasActivePlus) {
    return new NextResponse(null, { status: 204 });
  }

  const monthBucket = currentMonthBucket();

  await prisma.storyRead.upsert({
    where: {
      userId_storyId_monthBucket: { userId: user.id, storyId: id, monthBucket },
    },
    create: {
      userId: user.id,
      storyId: id,
      monthBucket,
      dwellSeconds,
    },
    update: {
      // Keep the max dwell observed in case we get multiple pings for the same read.
      dwellSeconds: dwellSeconds ?? undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
