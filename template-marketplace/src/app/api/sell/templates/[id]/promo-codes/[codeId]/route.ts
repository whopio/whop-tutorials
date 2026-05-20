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
    include: { sellerProfile: { select: { whopCompanyId: true } } },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  if (!template.whopProductId) {
    return NextResponse.json({ error: "Promo code not found" }, { status: 404 });
  }

  // Defense in depth: the Company API Key has org-wide permission to delete
  // any promo code on the platform. Without this check, an authenticated
  // seller could pass any codeId in the URL and archive promo codes
  // belonging to other sellers' templates. Verify the codeId actually
  // belongs to this template's product before deleting.
  let belongsToTemplate = false;
  try {
    for await (const code of whopCompany.promoCodes.list({
      company_id: template.sellerProfile.whopCompanyId,
      product_ids: [template.whopProductId],
    })) {
      if (code.id === codeId) {
        belongsToTemplate = true;
        break;
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Promo code ownership check failed", { codeId, message });
    return NextResponse.json(
      { error: "Couldn't verify promo code", detail: message.slice(0, 500) },
      { status: 500 },
    );
  }

  if (!belongsToTemplate) {
    return NextResponse.json({ error: "Promo code not found" }, { status: 404 });
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
