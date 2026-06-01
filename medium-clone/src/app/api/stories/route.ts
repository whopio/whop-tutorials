import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateStorySlug } from "@/lib/slug";

const CreateSchema = z.object({
  title: z.string().max(160).optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const title = (parsed.data.title || "Untitled draft").trim().slice(0, 160);
  const slug = await generateStorySlug(user.id, title);

  const story = await prisma.story.create({
    data: {
      authorUserId: user.id,
      title,
      slug,
      contentJson: { type: "doc", content: [{ type: "paragraph" }] },
    },
  });

  return NextResponse.json({ id: story.id });
}
