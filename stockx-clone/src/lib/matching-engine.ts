import { BidStatus, AskStatus, TradeStatus, NotificationType } from "@prisma/client";
import type { Prisma, Trade } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PLATFORM_FEE_PERCENT } from "@/constants";
import { createDmChannel, sendSystemMessage } from "@/services/chat";

type TransactionClient = Prisma.TransactionClient;

/**
 * Attempt to match a newly placed bid against the lowest active ask.
 * Returns the created Trade if matched, or null if no match found.
 */
export async function matchBid(bidId: string) {
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
  });

  if (!bid || bid.status !== BidStatus.ACTIVE) {
    return null;
  }

  const lowestAsk = await prisma.ask.findFirst({
    where: {
      productSizeId: bid.productSizeId,
      status: AskStatus.ACTIVE,
      price: { lte: bid.price },
    },
    orderBy: { price: "asc" },
  });

  if (!lowestAsk) {
    return null;
  }

  const trade = await prisma.$transaction(async (tx: TransactionClient) => {
    const freshBid = await tx.bid.findUnique({ where: { id: bidId } });
    const freshAsk = await tx.ask.findUnique({ where: { id: lowestAsk.id } });

    if (
      !freshBid ||
      freshBid.status !== BidStatus.ACTIVE ||
      !freshAsk ||
      freshAsk.status !== AskStatus.ACTIVE
    ) {
      return null;
    }

    const tradePrice = freshAsk.price;
    const platformFee = Number(
      (tradePrice * (PLATFORM_FEE_PERCENT / 100)).toFixed(2)
    );

    await tx.bid.update({
      where: { id: freshBid.id },
      data: { status: BidStatus.MATCHED },
    });

    await tx.ask.update({
      where: { id: freshAsk.id },
      data: { status: AskStatus.MATCHED },
    });

    const newTrade = await tx.trade.create({
      data: {
        buyerId: freshBid.userId,
        sellerId: freshAsk.userId,
        productSizeId: freshBid.productSizeId,
        bidId: freshBid.id,
        askId: freshAsk.id,
        price: tradePrice,
        platformFee,
        status: TradeStatus.MATCHED,
      },
    });

    await updateProductSizeStats(freshBid.productSizeId, tx);

    await tx.notification.createMany({
      data: [
        {
          userId: freshBid.userId,
          type: NotificationType.BID_MATCHED,
          title: "Bid matched!",
          message: `Your bid of $${freshBid.price.toFixed(2)} was matched at $${tradePrice.toFixed(2)}.`,
          metadata: { tradeId: newTrade.id },
        },
        {
          userId: freshAsk.userId,
          type: NotificationType.ASK_MATCHED,
          title: "Ask matched!",
          message: `Your ask of $${freshAsk.price.toFixed(2)} was matched. Prepare to ship your item.`,
          metadata: { tradeId: newTrade.id },
        },
      ],
    });

    return newTrade;
  });

  if (trade) {
    await setupTradeChat(trade);
  }

  return trade;
}

/**
 * Attempt to match a newly placed ask against the highest active bid.
 * Returns the created Trade if matched, or null if no match found.
 */
export async function matchAsk(askId: string) {
  const ask = await prisma.ask.findUnique({
    where: { id: askId },
  });

  if (!ask || ask.status !== AskStatus.ACTIVE) {
    return null;
  }

  const highestBid = await prisma.bid.findFirst({
    where: {
      productSizeId: ask.productSizeId,
      status: BidStatus.ACTIVE,
      price: { gte: ask.price },
    },
    orderBy: { price: "desc" },
  });

  if (!highestBid) {
    return null;
  }

  const trade = await prisma.$transaction(async (tx: TransactionClient) => {
    const freshAsk = await tx.ask.findUnique({ where: { id: askId } });
    const freshBid = await tx.bid.findUnique({ where: { id: highestBid.id } });

    if (
      !freshAsk ||
      freshAsk.status !== AskStatus.ACTIVE ||
      !freshBid ||
      freshBid.status !== BidStatus.ACTIVE
    ) {
      return null;
    }

    const tradePrice = freshAsk.price;
    const platformFee = Number(
      (tradePrice * (PLATFORM_FEE_PERCENT / 100)).toFixed(2)
    );

    await tx.bid.update({
      where: { id: freshBid.id },
      data: { status: BidStatus.MATCHED },
    });

    await tx.ask.update({
      where: { id: freshAsk.id },
      data: { status: AskStatus.MATCHED },
    });

    const newTrade = await tx.trade.create({
      data: {
        buyerId: freshBid.userId,
        sellerId: freshAsk.userId,
        productSizeId: freshAsk.productSizeId,
        bidId: freshBid.id,
        askId: freshAsk.id,
        price: tradePrice,
        platformFee,
        status: TradeStatus.MATCHED,
      },
    });

    await updateProductSizeStats(freshAsk.productSizeId, tx);

    await tx.notification.createMany({
      data: [
        {
          userId: freshBid.userId,
          type: NotificationType.BID_MATCHED,
          title: "Bid matched!",
          message: `Your bid of $${freshBid.price.toFixed(2)} was matched at $${tradePrice.toFixed(2)}.`,
          metadata: { tradeId: newTrade.id },
        },
        {
          userId: freshAsk.userId,
          type: NotificationType.ASK_MATCHED,
          title: "Ask matched!",
          message: `Your ask of $${freshAsk.price.toFixed(2)} was matched. Prepare to ship your item.`,
          metadata: { tradeId: newTrade.id },
        },
      ],
    });

    return newTrade;
  });

  if (trade) {
    await setupTradeChat(trade);
  }

  return trade;
}

/**
 * Create a DM channel for a trade and send an initial system message.
 * Runs after the transaction - if it fails, the trade still stands.
 */
async function setupTradeChat(trade: Trade) {
  try {
    const [buyer, seller, productSize] = await Promise.all([
      prisma.user.findUnique({
        where: { id: trade.buyerId },
        select: { whopId: true },
      }),
      prisma.user.findUnique({
        where: { id: trade.sellerId },
        select: { whopId: true },
      }),
      prisma.productSize.findUnique({
        where: { id: trade.productSizeId },
        include: { product: { select: { name: true } } },
      }),
    ]);

    if (!buyer?.whopId || !seller?.whopId || !productSize) return;
    if (buyer.whopId === seller.whopId) {
      console.log("setupTradeChat: skipping DM for self-match trade");
      return;
    }

    const channelName = `Trade: ${productSize.product.name} Size ${productSize.size}`;
    const channelId = await createDmChannel(
      buyer.whopId,
      seller.whopId,
      channelName
    );

    await prisma.trade.update({
      where: { id: trade.id },
      data: { chatChannelId: channelId },
    });

    await sendSystemMessage(
      channelId,
      `Trade matched at $${trade.price.toFixed(2)}! Use this chat to coordinate shipping details.`
    );
  } catch (error: unknown) {
    console.error("Failed to set up trade chat:", error);
  }
}

/**
 * Recalculate aggregate fields on ProductSize after a trade or order change.
 */
async function updateProductSizeStats(
  productSizeId: string,
  tx: TransactionClient
) {
  const lowestActiveAsk = await tx.ask.findFirst({
    where: { productSizeId, status: AskStatus.ACTIVE },
    orderBy: { price: "asc" },
    select: { price: true },
  });

  const highestActiveBid = await tx.bid.findFirst({
    where: { productSizeId, status: BidStatus.ACTIVE },
    orderBy: { price: "desc" },
    select: { price: true },
  });

  const lastTrade = await tx.trade.findFirst({
    where: { productSizeId, status: TradeStatus.DELIVERED },
    orderBy: { createdAt: "desc" },
    select: { price: true },
  });

  await tx.productSize.update({
    where: { id: productSizeId },
    data: {
      lowestAsk: lowestActiveAsk?.price ?? null,
      highestBid: highestActiveBid?.price ?? null,
      lastSalePrice: lastTrade?.price ?? undefined,
    },
  });
}
