import { NextRequest, NextResponse } from "next/server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const updateSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  description: z.string().max(2000).optional(),
  price: z.number().int().min(0).optional(),
  tool: z.enum([
    "NOTION", "FIGMA", "WEBFLOW", "FRAMER", "CODE",
    "DOCX", "XLSX", "PPTX", "AI_PROMPT", "OTHER",
  ]).optional(),
  category: z.enum([
    "PRODUCTIVITY", "PROJECT_MANAGEMENT", "LANDING_PAGES", "DASHBOARDS",
    "BRANDING", "DEV_BOILERPLATES", "MARKETING", "FINANCE", "OTHER",
  ]).optional(),
  deliveryType: z.enum(["FILE_DOWNLOAD", "SHARE_URL"]).optional(),
  shareUrl: z.string().url().nullable().optional(),
  content: z.string().max(10000).nullable().optional(),
});

async function loadOwnedTemplate(id: string, userId: string) {
  return prisma.template.findFirst({
    where: { id, sellerProfile: { userId } },
  });
}

export async function PATCH(
  request: NextRequest,
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

  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", detail: parsed.error.message },
      { status: 400 },
    );
  }

  const updated = await prisma.template.update({
    where: { id },
    data: parsed.data,
  });
  // Edit could change title, price, tool, category, delivery, share URL —
  // every one of those is shown on the catalog card or the detail page, so
  // bust both the global list and the per-template caches.
  updateTag("templates");
  updateTag(`template:${updated.slug}`);
  return NextResponse.json({ ok: true, template: updated });
}

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

  // Block hard delete if any Purchase exists. Cascade deletion would wipe
  // the buyer's access along with the template, which they paid for. Sellers
  // who want to take a sold template offline should archive it instead.
  const purchaseCount = await prisma.purchase.count({ where: { templateId: id } });
  if (purchaseCount > 0) {
    return NextResponse.json(
      {
        error: `This template has ${purchaseCount} ${purchaseCount === 1 ? "purchase" : "purchases"}. Archive it instead so buyers keep access.`,
        purchaseCount,
      },
      { status: 409 },
    );
  }

  await prisma.template.delete({ where: { id } });
  updateTag("templates");
  updateTag(`template:${owned.slug}`);
  return NextResponse.json({ ok: true });
}
