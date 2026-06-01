import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateStorySlug } from "@/lib/slug";
import { buildExcerpt } from "@/lib/excerpt";
import { computeReadingTime } from "@/lib/reading-time";
import { findPaywallNodePos } from "@/lib/tiptap/paywall-break-node";
import type { JSONContent } from "@tiptap/core";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireAuth();
  const story = await prisma.story.findUnique({
    where: { id },
    select: {
      id: true,
      authorUserId: true,
      title: true,
      contentJson: true,
      slug: true,
      status: true,
    },
  });
  if (!story || story.authorUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!story.title.trim()) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  // Stories with a paywallBreak node auto-flip to PLUS visibility.
  // (The reading-page paywall gate is wired in Part 3.)
  const doc = story.contentJson as JSONContent;
  const paywallPos = findPaywallNodePos(doc);
  const visibility = paywallPos !== null ? "PLUS" : "FREE";

  const slug = await generateStorySlug(user.id, story.title, story.id);

  await prisma.story.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      visibility,
      paywallNodePos: paywallPos,
      slug,
      excerpt: buildExcerpt(doc),
      readingTimeMinutes: computeReadingTime(doc),
      publishedAt: story.status === "PUBLISHED" ? undefined : new Date(),
    },
  });

  return NextResponse.json({ ok: true, slug });
}
