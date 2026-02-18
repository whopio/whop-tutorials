import { NextRequest } from "next/server";
import {
  PaymentStatus,
  TradeStatus,
  BidStatus,
  AskStatus,
  NotificationType,
} from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { whopsdk } from "@/lib/whop";
import { prisma } from "@/lib/prisma";
import { sendSystemMessage } from "@/services/chat";

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const headers = Object.fromEntries(request.headers);

    // Verify webhook signature and parse payload
    let webhookData: { type: string; data: Record<string, unknown> };
    try {
      webhookData = (await whopsdk.webhooks.unwrap(bodyText, {
        headers,
      })) as unknown as {
        type: string;
        data: Record<string, unknown>;
      };
    } catch {
      return new Response("Invalid webhook signature", { status: 401 });
    }

    // Process asynchronously to return 200 immediately
    waitUntil(processWebhook(webhookData));

    return new Response("OK", { status: 200 });
  } catch (error: unknown) {
    console.error("Webhook handler error:", error);
    return new Response("OK", { status: 200 });
  }
}

async function processWebhook(webhookData: {
  type: string;
  data: Record<string, unknown>;
}) {
  try {
    const paymentId = webhookData.data.id as string | undefined;
    if (!paymentId) return;

    // Idempotency check
    const existingPayment = await prisma.payment.findFirst({
      where: { whopPaymentId: paymentId },
    });
    if (existingPayment) return;

    const tradeId = webhookData.data.metadata
      ? (webhookData.data.metadata as Record<string, unknown>).tradeId as
          | string
          | undefined
      : undefined;

    switch (webhookData.type) {
      case "payment.succeeded": {
        if (!tradeId) return;

        const trade = await prisma.trade.findUnique({
          where: { id: tradeId },
        });
        if (!trade) return;

        await prisma.$transaction(async (tx) => {
          // Create Payment record
          await tx.payment.create({
            data: {
              tradeId: trade.id,
              whopPaymentId: paymentId,
              amount: trade.price,
              platformFee: trade.platformFee,
              status: PaymentStatus.SUCCEEDED,
              idempotencyKey: `payment_succeeded_${paymentId}`,
            },
          });

          // Update trade status
          await tx.trade.update({
            where: { id: trade.id },
            data: { status: TradeStatus.PAID },
          });

          // Notify buyer and seller
          await tx.notification.createMany({
            data: [
              {
                userId: trade.buyerId,
                type: NotificationType.TRADE_COMPLETED,
                title: "Payment confirmed",
                message: `Your payment of $${trade.price.toFixed(2)} has been confirmed.`,
                metadata: { tradeId: trade.id },
              },
              {
                userId: trade.sellerId,
                type: NotificationType.ITEM_SHIPPED,
                title: "New sale - ship your item",
                message: `A buyer has paid $${trade.price.toFixed(2)}. Please ship your item for authentication.`,
                metadata: { tradeId: trade.id },
              },
            ],
          });
        });

        // Send chat system message
        if (trade.chatChannelId) {
          await sendSystemMessage(
            trade.chatChannelId,
            "Payment confirmed! Seller, please ship your item for authentication."
          );
        }

        break;
      }

      case "payment.failed": {
        if (!tradeId) return;

        const trade = await prisma.trade.findUnique({
          where: { id: tradeId },
          include: { bid: true, ask: true },
        });
        if (!trade) return;

        await prisma.$transaction(async (tx) => {
          // Create Payment record
          await tx.payment.create({
            data: {
              tradeId: trade.id,
              whopPaymentId: paymentId,
              amount: trade.price,
              platformFee: trade.platformFee,
              status: PaymentStatus.FAILED,
              idempotencyKey: `payment_failed_${paymentId}`,
            },
          });

          // Update trade status
          await tx.trade.update({
            where: { id: trade.id },
            data: { status: TradeStatus.FAILED },
          });

          // Reopen the original bid and ask
          if (trade.bid) {
            await tx.bid.update({
              where: { id: trade.bid.id },
              data: { status: BidStatus.ACTIVE },
            });
          }

          if (trade.ask) {
            await tx.ask.update({
              where: { id: trade.ask.id },
              data: { status: AskStatus.ACTIVE },
            });
          }

          // Notify buyer of payment failure
          await tx.notification.create({
            data: {
              userId: trade.buyerId,
              type: NotificationType.ITEM_FAILED,
              title: "Payment failed",
              message:
                "Your payment could not be processed. Your bid has been reopened.",
              metadata: { tradeId: trade.id },
            },
          });
        });

        // Send chat system message
        if (trade.chatChannelId) {
          await sendSystemMessage(
            trade.chatChannelId,
            "Payment failed. The bid and ask have been reopened."
          );
        }

        break;
      }
    }
  } catch (error: unknown) {
    console.error("Webhook processing error:", error);
  }
}
