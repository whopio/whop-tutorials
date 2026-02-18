import { TradeStatus, PaymentStatus, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCheckoutForTrade, refundPayment } from "@/services/whop";

/**
 * Initiate payment for a matched trade.
 * Creates a Whop checkout and transitions trade to PAYMENT_PENDING.
 */
export async function initiatePayment(tradeId: string) {
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: {
      seller: true,
      productSize: { include: { product: true } },
    },
  });

  if (!trade) {
    throw new Error("Trade not found");
  }

  if (trade.status !== TradeStatus.MATCHED) {
    throw new Error(`Trade is in ${trade.status} state, expected MATCHED`);
  }

  const checkout = await createCheckoutForTrade({
    id: trade.id,
    price: trade.price,
    platformFee: trade.platformFee,
    buyerId: trade.buyerId,
    sellerId: trade.sellerId,
    seller: {
      whopId: trade.seller.whopId,
      connectedAccountId: trade.seller.connectedAccountId,
    },
  });

  await prisma.trade.update({
    where: { id: trade.id },
    data: { status: TradeStatus.PAYMENT_PENDING },
  });

  return checkout;
}

/**
 * Process a refund for a failed authentication.
 * Refunds buyer via Whop and relists seller's ask.
 */
export async function processRefund(tradeId: string) {
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: { payment: true, ask: true, productSize: { include: { product: true } } },
  });

  if (!trade || !trade.payment) {
    throw new Error("Trade or payment not found");
  }

  if (trade.status !== TradeStatus.FAILED) {
    throw new Error(`Trade is in ${trade.status} state, expected FAILED`);
  }

  await refundPayment(trade.payment.whopPaymentId);

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: trade.payment!.id },
      data: { status: PaymentStatus.REFUNDED },
    });

    await tx.trade.update({
      where: { id: trade.id },
      data: { status: TradeStatus.REFUNDED },
    });

    if (trade.ask) {
      await tx.ask.update({
        where: { id: trade.ask.id },
        data: { status: "ACTIVE" },
      });
    }

    await tx.notification.createMany({
      data: [
        {
          userId: trade.buyerId,
          type: NotificationType.ITEM_FAILED,
          title: "Refund processed",
          message: `Your payment of $${trade.price.toFixed(2)} for ${trade.productSize.product.name} has been refunded.`,
          metadata: { tradeId: trade.id },
        },
        {
          userId: trade.sellerId,
          type: NotificationType.ITEM_FAILED,
          title: "Item relisted",
          message: `Your ask for ${trade.productSize.product.name} has been relisted after authentication failure.`,
          metadata: { tradeId: trade.id },
        },
      ],
    });
  });
}
