import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { whopCompany } from "@/lib/whop";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; codeId: string }> },
) {
  const { id, codeId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const template = await prisma.template.findFirst({
    where: { id, sellerProfile: { userId: session.userId } },
    select: { id: true },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  try {
    await whopCompany.promoCodes.delete(codeId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Promo code archive failed", { codeId, message });
    return NextResponse.json(
      { error: "Couldn't archive promo code", detail: message.slice(0, 500) },
      { status: 500 },
    );
  }
}
