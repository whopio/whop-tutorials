import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireAuth();
  const story = await prisma.story.findUnique({
    where: { id },
    select: { id: true, authorUserId: true },
  });
  if (!story || story.authorUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.story.update({
    where: { id },
    data: { status: "DRAFT" },
  });

  return NextResponse.json({ ok: true });
}
