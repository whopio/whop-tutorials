import { NextResponse, type NextRequest } from "next/server";
import { requireOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyWhop } from "@/lib/whop";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireOperator();
  const { id } = await params;

  const row = await prisma.promoCode.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.archivedAt) return NextResponse.json({ ok: true });

  try {
    await getCompanyWhop().promoCodes.delete(row.whopPromoCodeId);
  } catch {
    // Continue — even if Whop's delete fails (e.g. already archived there), keep our row consistent.
  }
  await prisma.promoCode.update({
    where: { id },
    data: { archivedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
