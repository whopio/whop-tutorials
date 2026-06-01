import { NextResponse, type NextRequest } from "next/server";
import { requireOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireOperator();
  const { id } = await params;

  const target = await prisma.operator.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.addedByUserId === null) {
    // Root operator (seeded from env) — undeletable from the UI.
    return NextResponse.json({ error: "Cannot remove the root operator" }, { status: 403 });
  }
  if (target.userId === me.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  await prisma.operator.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
