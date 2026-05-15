import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id, fileId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const file = await prisma.templateFile.findFirst({
    where: {
      id: fileId,
      templateId: id,
      template: { sellerProfile: { userId: session.userId } },
    },
  });
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  await prisma.templateFile.delete({ where: { id: fileId } });

  // If we just deleted the thumbnail, fall back to the next preview if any
  if (file.kind === "PREVIEW") {
    const next = await prisma.templateFile.findFirst({
      where: { templateId: id, kind: "PREVIEW" },
      orderBy: { displayOrder: "asc" },
    });
    await prisma.template.update({
      where: { id },
      data: { thumbnailUrl: next?.fileUrl ?? null },
    });
  }

  return NextResponse.json({ ok: true });
}
