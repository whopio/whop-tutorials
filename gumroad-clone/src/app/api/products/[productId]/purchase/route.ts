import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { env } from "@/lib/env";

// Free product purchase — paid products go through Whop checkout + webhook
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product || product.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.price !== 0) {
    return NextResponse.json(
      { error: "This product requires payment. Use the checkout link." },
      { status: 400 }
    );
  }

  // Check if already purchased
  const existingPurchase = await prisma.purchase.findUnique({
    where: {
      userId_productId: {
        userId: session.userId,
        productId,
      },
    },
  });

  if (existingPurchase) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/products/${product.slug}/download`
    );
  }

  await prisma.purchase.create({
    data: {
      userId: session.userId,
      productId,
      pricePaid: 0,
    },
  });

  // Redirect to the download page — the form POSTs here via native HTML,
  // so the browser follows the redirect automatically.
  return NextResponse.redirect(
    `${env.NEXT_PUBLIC_APP_URL}/products/${product.slug}/download`
  );
}
