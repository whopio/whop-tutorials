// src/app/api/sell/products/[productId]/unpublish/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

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

  if (!sellerProfile) {
    return NextResponse.json({ error: "Not a seller" }, { status: 403 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product || product.sellerProfileId !== sellerProfile.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Product is not published" }, { status: 400 });
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      status: "DRAFT",
      whopCheckoutUrl: null,
    },
  });

  return NextResponse.json(updated);
}
