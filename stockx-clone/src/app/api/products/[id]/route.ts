import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        sizes: {
          include: {
            bids: {
              where: { status: "ACTIVE" },
              orderBy: { price: "desc" },
              take: 5,
              select: { id: true, price: true, createdAt: true },
            },
            asks: {
              where: { status: "ACTIVE" },
              orderBy: { price: "asc" },
              take: 5,
              select: { id: true, price: true, createdAt: true },
            },
            trades: {
              where: { status: "DELIVERED" },
              orderBy: { createdAt: "desc" },
              take: 20,
              select: { id: true, price: true, createdAt: true },
            },
          },
          orderBy: { size: "asc" },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error: unknown) {
    console.error("Failed to fetch product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
