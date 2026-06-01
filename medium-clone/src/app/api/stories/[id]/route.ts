import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildExcerpt } from "@/lib/excerpt";
import { computeReadingTime } from "@/lib/reading-time";
import type { JSONContent } from "@tiptap/core";

const PatchSchema = z.object({
  title: z.string().max(160).optional(),
  subtitle: z.string().max(280).optional().nullable(),
  contentJson: z.unknown().optional(),
  coverImageUrl: z.string().url().optional().nullable(),
  coverImageKey: z.string().optional().nullable(),
  topicSlugs: z.array(z.string()).max(5).optional(),
});

async function findOwnedStory(storyId: string, userId: string) {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { id: true, authorUserId: true, status: true, title: true },
  });
  if (!story || story.authorUserId !== userId) return null;
  return story;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireAuth();
  const story = await findOwnedStory(id, user.id);
  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title.trim().slice(0, 160) || "Untitled draft";
  if (parsed.data.subtitle !== undefined) data.subtitle = parsed.data.subtitle;
  if (parsed.data.coverImageUrl !== undefined) data.coverImageUrl = parsed.data.coverImageUrl;
  if (parsed.data.coverImageKey !== undefined) data.coverImageKey = parsed.data.coverImageKey;

  if (parsed.data.contentJson !== undefined) {
    const json = parsed.data.contentJson as JSONContent;
    data.contentJson = json as unknown as object;
    data.excerpt = buildExcerpt(json);
    data.readingTimeMinutes = computeReadingTime(json);
  }

  await prisma.$transaction(async (tx) => {
    await tx.story.update({ where: { id }, data });

    if (parsed.data.topicSlugs) {
      const topics = await tx.topic.findMany({
        where: { slug: { in: parsed.data.topicSlugs } },
        select: { id: true },
      });
      await tx.storyTopic.deleteMany({ where: { storyId: id } });
      if (topics.length > 0) {
        await tx.storyTopic.createMany({
          data: topics.map((t) => ({ storyId: id, topicId: t.id })),
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireAuth();
  const story = await findOwnedStory(id, user.id);
  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.story.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
