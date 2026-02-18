import { prisma } from "@/lib/prisma";
import { BidStatus, AskStatus, TradeStatus } from "@prisma/client";

export async function getProductBySlugOrId(idOrSku: string) {
  return prisma.product.findFirst({
    where: {
      OR: [{ id: idOrSku }, { sku: idOrSku }],
    },
    include: {
      sizes: {
        orderBy: { size: "asc" },
      },
    },
  });
}

export async function getProductMarketData(productSizeId: string) {
  const [lowestAsk, highestBid, recentSales, bidCount, askCount] =
    await Promise.all([
      prisma.ask.findFirst({
        where: { productSizeId, status: AskStatus.ACTIVE },
        orderBy: { price: "asc" },
        select: { price: true },
      }),
      prisma.bid.findFirst({
        where: { productSizeId, status: BidStatus.ACTIVE },
        orderBy: { price: "desc" },
        select: { price: true },
      }),
      prisma.trade.findMany({
        where: { productSizeId, status: TradeStatus.DELIVERED },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { price: true, createdAt: true },
      }),
      prisma.bid.count({
        where: { productSizeId, status: BidStatus.ACTIVE },
      }),
      prisma.ask.count({
        where: { productSizeId, status: AskStatus.ACTIVE },
      }),
    ]);

  return {
    lowestAsk: lowestAsk?.price ?? null,
    highestBid: highestBid?.price ?? null,
    recentSales,
    bidCount,
    askCount,
  };
}

export async function getTrendingProducts(limit = 12) {
  return prisma.product.findMany({
    orderBy: {
      sizes: {
        _count: "desc",
      },
    },
    take: limit,
    include: {
      sizes: {
        select: {
          id: true,
          size: true,
          lowestAsk: true,
          highestBid: true,
          lastSalePrice: true,
          salesCount: true,
        },
        orderBy: { salesCount: "desc" },
        take: 1,
      },
    },
  });
}
