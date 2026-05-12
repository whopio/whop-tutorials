import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let event;
  try {
    event = whop.webhooks.unwrap(rawBody, {
      headers,
      key: process.env.WHOP_WEBHOOK_SECRET,
    });
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  if (event.type === "payment.succeeded") {
    const payment = event.data;
    const paymentId = payment.id;

    try {
      // Check if already processed via redirect
      const existing = await prisma.unlock.findUnique({
        where: { whopPaymentId: paymentId },
      });

      if (!existing) {
        // Use metadata from the payment
        const metadata = payment.metadata as Record<string, string> | null;
        const unlockId = metadata?.unlock_id;

        if (unlockId) {
          await prisma.unlock.updateMany({
            where: { id: unlockId, status: "PENDING" },
            data: { status: "PAID", whopPaymentId: paymentId },
          });

          // Increment song plays
          const unlock = await prisma.unlock.findUnique({ where: { id: unlockId } });
          if (unlock) {
            await prisma.song.update({
              where: { id: unlock.songId },
              data: { plays: { increment: 1 } },
            });
          }
        }
      }
    } catch (err) {
      console.error("Webhook payment.succeeded error:", err);
    }
  }

  if (event.type === "payment.failed") {
    const payment = event.data;
    const paymentId = payment.id;

    try {
      await prisma.unlock.updateMany({
        where: { whopPaymentId: paymentId },
        data: { status: "FAILED" },
      });
    } catch (err) {
      console.error("Webhook payment.failed error:", err);
    }
  }

  return NextResponse.json({ received: true });
}
