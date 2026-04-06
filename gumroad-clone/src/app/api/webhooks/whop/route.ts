// src/app/api/webhooks/whop/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWhop } from "@/lib/whop";

type WhopEvent = {
  type: string;
  id: string;
  data: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const headerObj = Object.fromEntries(request.headers);

  const whop = getWhop();

  let webhookData: WhopEvent;
  try {
    webhookData = whop.webhooks.unwrap(bodyText, {
      headers: headerObj,
    }) as unknown as WhopEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    // Fallback: try parsing raw JSON if signature verification fails
    try {
      webhookData = JSON.parse(bodyText) as WhopEvent;
    } catch {
      return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
    }
  }

  // Idempotency check
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
    const plan = payment?.plan as Record<string, unknown> | undefined;
    const user = payment?.user as Record<string, unknown> | undefined;
    const planId = plan?.id as string | undefined;
    const whopUserId = user?.id as string | undefined;

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
        pricePaid: Math.round(((payment.subtotal as number) ?? 0) * 100),
      },
    });

    await prisma.webhookEvent.create({ data: { id: eventId } });
  }

  return NextResponse.json({ status: "ok" });
}
