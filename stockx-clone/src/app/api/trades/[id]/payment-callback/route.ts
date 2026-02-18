import { NextRequest, NextResponse } from "next/server";
import {
  PaymentStatus,
  TradeStatus,
  NotificationType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { getPaymentStatus } from "@/services/whop";
import { sendSystemMessage } from "@/services/chat";

/**
 * Payment callback - Whop redirects the buyer here after checkout.
 * Verifies the payment with Whop API and updates the trade status.
 * Acts as a fallback for webhook delivery (webhooks are the primary mechanism).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tradeId } = await params;
  const paymentId = request.nextUrl.searchParams.get("payment_id");
  const checkoutStatus = request.nextUrl.searchParams.get("checkout_status");

  const dashboardUrl = `${env.NEXT_PUBLIC_APP_URL}/dashboard`;

  if (!tradeId || !paymentId) {
    return NextResponse.redirect(`${dashboardUrl}?payment=error`);
  }

  try {
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
    });

    if (!trade) {
      return NextResponse.redirect(`${dashboardUrl}?payment=error`);
    }

    // If the trade is already PAID (webhook handled it first), just redirect
    if (trade.status === TradeStatus.PAID) {
      return NextResponse.redirect(
        `${dashboardUrl}?payment=success&tradeId=${tradeId}`
      );
    }

    // If checkout was not successful, redirect with failure status
    if (checkoutStatus !== "success") {
      return NextResponse.redirect(
        `${dashboardUrl}?payment=failed&tradeId=${tradeId}`
      );
    }

    // Verify payment status with Whop API
    // Whop uses "paid" for status, "succeeded" for substatus
    const payment = await getPaymentStatus(paymentId);
    const whopPayment = payment as {
      status?: string;
      substatus?: string;
    };
    const isPaid =
      whopPayment.status === "paid" ||
      whopPayment.substatus === "succeeded";

    if (isPaid) {
      // Idempotency check - don't create duplicate Payment records
      const existingPayment = await prisma.payment.findFirst({
        where: { whopPaymentId: paymentId },
      });

      if (!existingPayment) {
        await prisma.$transaction(async (tx) => {
          // Create Payment record
          await tx.payment.create({
            data: {
              tradeId: trade.id,
              whopPaymentId: paymentId,
              amount: trade.price,
              platformFee: trade.platformFee,
              status: PaymentStatus.SUCCEEDED,
              idempotencyKey: `payment_callback_${paymentId}`,
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
      }

      // Send chat system message
      if (trade.chatChannelId) {
        await sendSystemMessage(
          trade.chatChannelId,
          "Payment confirmed! Seller, please ship your item for authentication."
        );
      }

      return NextResponse.redirect(
        `${dashboardUrl}?payment=success&tradeId=${tradeId}`
      );
    }

    // Payment not yet confirmed - redirect with pending status
    return NextResponse.redirect(
      `${dashboardUrl}?payment=pending&tradeId=${tradeId}`
    );
  } catch (error: unknown) {
    console.error("Payment callback error:", error);
    return NextResponse.redirect(
      `${dashboardUrl}?payment=error&tradeId=${tradeId}`
    );
  }
}
