import { NextRequest, NextResponse } from "next/server";
import { unwrapWebhook } from "@whop/sdk/helpers";
import { prisma } from "@/lib/prisma";

type WhopEvent = {
  type: string;
  id: string;
  data: Record<string, unknown>;
};

// Depending on the webhook's API version, Whop sends either nested objects
// (plan.id) and plain numbers, or flat IDs (plan_id) and money objects
// ({ amount: "29.00" }). These two helpers read both shapes.
function nestedId(value: unknown): string | undefined {
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === "string") return id;
  }
  return undefined;
}

function amountInDollars(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "amount" in value) {
    const amount = Number((value as { amount: unknown }).amount);
    if (Number.isFinite(amount)) return amount;
  }
  return 0;
}

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const headerObj = Object.fromEntries(request.headers);

  let webhookData: WhopEvent;
  try {
    webhookData = unwrapWebhook<WhopEvent>(bodyText, {
      headers: headerObj,
      key: process.env.WHOP_WEBHOOK_SECRET,
    });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const eventId = webhookData.id;
  if (!eventId) {
    return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
  }

  const existing = await prisma.webhookEvent.findUnique({
    where: { id: eventId },
  });

  if (existing) {
    return NextResponse.json({ status: "already_processed" });
  }

  if (webhookData.type === "payment.succeeded") {
    const payment = webhookData.data;
    const planId =
      typeof payment.plan_id === "string" ? payment.plan_id : nestedId(payment.plan);
    const whopUserId = nestedId(payment.user);

    if (!planId || !whopUserId) {
      console.error("Missing plan or user on payment webhook:", JSON.stringify(webhookData.data, null, 2));
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: { whopPlanId: planId },
    });

    if (!product) {
      console.error("No product found for plan:", planId);
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { whopUserId },
    });

    if (!dbUser) {
      console.error("No user found for Whop user:", whopUserId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.purchase.upsert({
      where: {
        userId_productId: {
          userId: dbUser.id,
          productId: product.id,
        },
      },
      update: {},
      create: {
        userId: dbUser.id,
        productId: product.id,
        whopPaymentId: payment.id as string,
        pricePaid: Math.round(amountInDollars(payment.subtotal) * 100),
      },
    });

    await prisma.webhookEvent.create({ data: { id: eventId } });
  }

  return NextResponse.json({ status: "ok" });
}
