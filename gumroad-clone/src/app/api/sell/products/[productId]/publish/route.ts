// src/app/api/sell/products/[productId]/publish/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getCompanyWhop } from "@/lib/whop";
import { env } from "@/lib/env";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
  });

  if (!sellerProfile || !sellerProfile.kycComplete) {
    return NextResponse.json(
      { error: "Complete seller onboarding first" },
      { status: 403 }
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { files: true },
  });

  if (!product || product.sellerProfileId !== sellerProfile.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.status === "PUBLISHED") {
    return NextResponse.json(
      { error: "Product is already published" },
      { status: 400 }
    );
  }

  // Must have at least one deliverable
  const hasFiles = product.files.length > 0;
  const hasContent = !!product.content;
  const hasLink = !!product.externalUrl;

  if (!hasFiles && !hasContent && !hasLink) {
    return NextResponse.json(
      {
        error:
          "Product must have at least one file, text content, or external link",
      },
      { status: 400 }
    );
  }

  try {
    // Create Whop product on the seller's connected account
    const whopProduct = await getCompanyWhop().products.create({
      company_id: sellerProfile.whopCompanyId,
      title: product.title,
      description: product.description,
    });

    const feePercent = env.PLATFORM_FEE_PERCENT;

    // Free products don't need a checkout configuration
    if (product.price === 0) {
      const updated = await prisma.product.update({
        where: { id: productId },
        data: {
          status: "PUBLISHED",
          whopProductId: whopProduct.id,
        },
      });

      return NextResponse.json(updated);
    }

    const feeAmount = Math.round(product.price * (feePercent / 100));

    // Create a checkout configuration with an inline plan and application fee.
    // company_id goes on the plan only, NOT on the top-level config.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const checkoutConfig = await (getCompanyWhop().checkoutConfigurations.create as any)({
      plan: {
        company_id: sellerProfile.whopCompanyId,
        currency: "usd",
        initial_price: product.price / 100,
        plan_type: "one_time",
        application_fee_amount: feeAmount / 100,
      },
    });

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: "PUBLISHED",
        whopProductId: whopProduct.id,
        whopPlanId: checkoutConfig.plan?.id ?? null,
        whopCheckoutUrl: checkoutConfig.purchase_url,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Publish error:", err);
    const message = err instanceof Error ? err.message : "Whop API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
