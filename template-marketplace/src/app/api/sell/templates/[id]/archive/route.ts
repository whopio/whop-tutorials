import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function loadOwnedTemplate(id: string, userId: string) {
  return prisma.template.findFirst({
    where: { id, sellerProfile: { userId } },
    select: { id: true, status: true },
  });
}

/**
 * Archive a template. Hides it from the marketplace and seller-facing listings,
 * but past Purchases keep working so buyers retain access. The Whop product +
 * checkout configuration are NOT touched, so existing checkout URLs technically
 * still work; sellers wanting full removal should hard-delete (only allowed
 * when there are zero purchases).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owned = await loadOwnedTemplate(id, session.userId);
  if (!owned) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await prisma.template.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  return NextResponse.json({ ok: true });
}

/**
 * Unarchive (back to DRAFT). Sellers must explicitly republish to make the
 * template purchasable again.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owned = await loadOwnedTemplate(id, session.userId);
  if (!owned) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await prisma.template.update({
    where: { id },
    data: { status: "DRAFT" },
  });
  return NextResponse.json({ ok: true });
}
