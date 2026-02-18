import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const trade = await prisma.trade.findUnique({
      where: { id },
      include: {
        productSize: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                brand: true,
                images: true,
                sku: true,
              },
            },
          },
        },
        buyer: { select: { id: true, username: true, displayName: true } },
        seller: { select: { id: true, username: true, displayName: true } },
        payment: true,
      },
    });

    if (!trade) {
      return NextResponse.json(
        { error: "Trade not found" },
        { status: 404 }
      );
    }

    if (trade.buyerId !== user.id && trade.sellerId !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to view this trade" },
        { status: 403 }
      );
    }

    return NextResponse.json({ trade });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Failed to fetch trade:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
