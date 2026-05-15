import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { appUrl } from "@/lib/whop";

/**
 * Free-template direct purchase. Skips Whop entirely.
 * Paid templates go through Whop's hosted checkout (the seller's whopCheckoutUrl);
 * those Purchase records are created by the payment.succeeded webhook in Part 5.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.redirect(`${appUrl}/sign-in`, { status: 303 });
  }

  const template = await prisma.template.findUnique({
    where: { id },
    select: { id: true, slug: true, status: true, price: true },
  });
  if (!template || template.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  if (template.price !== 0) {
    return NextResponse.json(
      { error: "Paid templates must go through Whop checkout" },
      { status: 400 },
    );
  }

  // Idempotent: upsert one purchase per (user, template)
  await prisma.purchase.upsert({
    where: { userId_templateId: { userId: session.userId, templateId: template.id } },
    create: { userId: session.userId, templateId: template.id, pricePaid: 0 },
    update: {},
  });

  return NextResponse.redirect(`${appUrl}/templates/${template.slug}/access`, { status: 303 });
}
