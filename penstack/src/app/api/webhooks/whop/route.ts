import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const headers = Object.fromEntries(request.headers);

  // Verify signature and parse payload using Whop SDK
  let webhookData: { type: string; data: Record<string, unknown>; id?: string };
  try {
    webhookData = (await whop.webhooks.unwrap(rawBody, { headers })) as unknown as {
      type: string;
      data: Record<string, unknown>;
      id?: string;
    };
  } catch (err) {
    console.error("Webhook unwrap error:", err);
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  const eventId = webhookData.id ?? (webhookData.data.id as string);
  const event = webhookData.type;
  const data = webhookData.data;

  // Idempotency check
  const existing = await prisma.webhookEvent.findUnique({
    where: { id: eventId },
  });
  if (existing) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event) {
      case "payment.succeeded":
        await handlePaymentSucceeded(data);
        break;
      case "payment.failed":
        await handlePaymentFailed(data);
        break;
      case "membership.activated":
        await handleMembershipActivated(data);
        break;
      case "membership.deactivated":
        await handleMembershipDeactivated(data);
        break;
      default:
        // Unknown event type — ignore
        break;
    }

    // Record processed event
    await prisma.webhookEvent.create({
      data: { id: eventId, eventType: event },
    });
  } catch (error) {
    console.error(`Webhook handler error for ${event}:`, error);
    return NextResponse.json(
      { error: "Internal webhook processing error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(data: Record<string, unknown>) {
  const membershipId = data.membership_id as string | undefined;
  if (!membershipId) return;

  const subscription = await prisma.subscription.findUnique({
    where: { whopMembershipId: membershipId },
    include: { writer: true },
  });
  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "ACTIVE" },
  });

  // Notify writer of payment
  await prisma.notification.create({
    data: {
      userId: subscription.writer.userId,
      type: "PAYMENT_RECEIVED",
      title: "Payment received",
      message: "A subscriber payment was successfully processed.",
      writerId: subscription.writerId,
    },
  });
}

async function handlePaymentFailed(data: Record<string, unknown>) {
  const membershipId = data.membership_id as string | undefined;
  if (!membershipId) return;

  const subscription = await prisma.subscription.findUnique({
    where: { whopMembershipId: membershipId },
    include: { writer: true },
  });
  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "PAST_DUE" },
  });

  // Notify writer of failed payment
  await prisma.notification.create({
    data: {
      userId: subscription.writer.userId,
      type: "PAYMENT_FAILED",
      title: "Payment failed",
      message: "A subscriber payment failed to process.",
      writerId: subscription.writerId,
    },
  });
}

async function handleMembershipActivated(data: Record<string, unknown>) {
  const membershipId = data.id as string;
  const userId = (data.metadata as Record<string, unknown>)?.userId as
    | string
    | undefined;
  const writerId = (data.metadata as Record<string, unknown>)?.writerId as
    | string
    | undefined;
  const currentPeriodEnd = data.current_period_end as string | undefined;

  if (!userId || !writerId) return;

  const subscription = await prisma.subscription.upsert({
    where: { userId_writerId: { userId, writerId } },
    update: {
      status: "ACTIVE",
      whopMembershipId: membershipId,
      currentPeriodEnd: currentPeriodEnd
        ? new Date(currentPeriodEnd)
        : undefined,
      cancelledAt: null,
    },
    create: {
      userId,
      writerId,
      status: "ACTIVE",
      whopMembershipId: membershipId,
      currentPeriodEnd: currentPeriodEnd
        ? new Date(currentPeriodEnd)
        : undefined,
    },
  });

  // Notify writer of new subscriber
  const writer = await prisma.writer.findUnique({ where: { id: writerId } });
  if (writer) {
    await prisma.notification.create({
      data: {
        userId: writer.userId,
        type: "NEW_SUBSCRIBER",
        title: "New subscriber",
        message: "Someone just subscribed to your publication!",
        writerId,
      },
    });
  }

  return subscription;
}

async function handleMembershipDeactivated(data: Record<string, unknown>) {
  const membershipId = data.id as string;

  const subscription = await prisma.subscription.findUnique({
    where: { whopMembershipId: membershipId },
  });
  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });
}
