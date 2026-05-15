import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateSlug } from "@/lib/slug";

const createSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(2000).default(""),
  price: z.number().int().min(0).default(0),
  tool: z.enum([
    "NOTION", "FIGMA", "WEBFLOW", "FRAMER", "CODE",
    "DOCX", "XLSX", "PPTX", "AI_PROMPT", "OTHER",
  ]).default("DOCX"),
  category: z.enum([
    "PRODUCTIVITY", "PROJECT_MANAGEMENT", "LANDING_PAGES", "DASHBOARDS",
    "BRANDING", "DEV_BOILERPLATES", "MARKETING", "FINANCE", "OTHER",
  ]).default("PRODUCTIVITY"),
  deliveryType: z.enum(["FILE_DOWNLOAD", "SHARE_URL"]).default("FILE_DOWNLOAD"),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
  });
  if (!seller) {
    return NextResponse.json({ error: "Not a seller" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", detail: parsed.error.message },
      { status: 400 },
    );
  }

  const slug = await generateSlug(parsed.data.title);
  const template = await prisma.template.create({
    data: {
      sellerProfileId: seller.id,
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      price: parsed.data.price,
      tool: parsed.data.tool,
      category: parsed.data.category,
      deliveryType: parsed.data.deliveryType,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ id: template.id, slug: template.slug });
}
