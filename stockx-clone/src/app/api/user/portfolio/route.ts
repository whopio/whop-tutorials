import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { BidStatus, AskStatus, TradeStatus } from "@prisma/client";

export async function GET() {
  try {
    const user = await requireAuth();

    const [
      activeBids,
      activeAsks,
      completedTrades,
      activeBidCount,
      activeAskCount,
      completedTradeCount,
      spentAggregate,
      earnedAggregate,
    ] = await Promise.all([
      prisma.bid.findMany({
        where: { userId: user.id, status: BidStatus.ACTIVE },
        orderBy: { createdAt: "desc" },
        include: {
          productSize: {
            select: {
              size: true,
              product: {
                select: { name: true, brand: true, images: true },
              },
            },
          },
        },
      }),
      prisma.ask.findMany({
        where: { userId: user.id, status: AskStatus.ACTIVE },
        orderBy: { createdAt: "desc" },
        include: {
          productSize: {
            select: {
              size: true,
              product: {
                select: { name: true, brand: true, images: true },
              },
            },
          },
        },
      }),
      prisma.trade.findMany({
        where: {
          OR: [{ buyerId: user.id }, { sellerId: user.id }],
          status: TradeStatus.DELIVERED,
        },
        orderBy: { createdAt: "desc" },
        include: {
          productSize: {
            select: {
              size: true,
              lastSalePrice: true,
              product: {
                select: { name: true, brand: true, images: true },
              },
            },
          },
        },
      }),
      prisma.bid.count({
        where: { userId: user.id, status: BidStatus.ACTIVE },
      }),
      prisma.ask.count({
        where: { userId: user.id, status: AskStatus.ACTIVE },
      }),
      prisma.trade.count({
        where: {
          OR: [{ buyerId: user.id }, { sellerId: user.id }],
          status: TradeStatus.DELIVERED,
        },
      }),
      prisma.trade.aggregate({
        where: { buyerId: user.id, status: TradeStatus.DELIVERED },
        _sum: { price: true },
      }),
      prisma.trade.aggregate({
        where: { sellerId: user.id, status: TradeStatus.DELIVERED },
        _sum: { price: true, platformFee: true },
      }),
    ]);

    const totalSpent = spentAggregate._sum.price ?? 0;
    const totalEarned =
      (earnedAggregate._sum.price ?? 0) -
      (earnedAggregate._sum.platformFee ?? 0);

    // Portfolio value: current market price of items the user purchased
    // Uses lastSalePrice from ProductSize as the current market value
    const purchasedTrades = completedTrades.filter(
      (t) => t.buyerId === user.id
    );
    const portfolioValue = purchasedTrades.reduce(
      (sum, t) => sum + (t.productSize.lastSalePrice ?? t.price),
      0
    );

    return NextResponse.json({
      activeBids: { count: activeBidCount, items: activeBids },
      activeAsks: { count: activeAskCount, items: activeAsks },
      completedTrades: { count: completedTradeCount, items: completedTrades },
      totalSpent: Number(totalSpent.toFixed(2)),
      totalEarned: Number(totalEarned.toFixed(2)),
      portfolioValue: Number(portfolioValue.toFixed(2)),
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("Failed to fetch portfolio:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
