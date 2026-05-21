import { NextRequest, NextResponse } from "next/server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const reviewSchema = z.object({
  stars: z.number().int().min(1).max(5),
  title: z.string().max(80).nullable().optional(),
  body: z.string().max(2000).nullable().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: templateId } = await params;

  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Purchase-gate the review write, only buyers can review
  const purchase = await prisma.purchase.findUnique({
    where: { userId_templateId: { userId: session.userId, templateId } },
    select: { id: true },
  });
  if (!purchase) {
    return NextResponse.json(
      { error: "Only buyers can review this template" },
      { status: 403 },
    );
  }

  // Sellers can't review their own template
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: { id: true, slug: true, sellerProfile: { select: { userId: true } } },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  if (template.sellerProfile.userId === session.userId) {
    return NextResponse.json(
      { error: "Sellers can't review their own template" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", detail: parsed.error.message },
      { status: 400 },
    );
  }

  const review = await prisma.review.upsert({
    where: { userId_templateId: { userId: session.userId, templateId } },
    create: {
      userId: session.userId,
      templateId,
      stars: parsed.data.stars,
      title: parsed.data.title ?? null,
      body: parsed.data.body ?? null,
    },
    update: {
      stars: parsed.data.stars,
      title: parsed.data.title ?? null,
      body: parsed.data.body ?? null,
    },
  });

  // Avg rating + review count are shown on the catalog card and the detail
  // page, so a new or edited review needs to bust both.
  updateTag("templates");
  updateTag(`template:${template.slug}`);

  return NextResponse.json({ ok: true, review });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: templateId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const review = await prisma.review.findUnique({
    where: { userId_templateId: { userId: session.userId, templateId } },
    select: { id: true, template: { select: { slug: true } } },
  });
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  await prisma.review.delete({ where: { id: review.id } });
  updateTag("templates");
  updateTag(`template:${review.template.slug}`);
  return NextResponse.json({ ok: true });
}
