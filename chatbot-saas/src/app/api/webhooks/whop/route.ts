import type { NextRequest } from "next/server";
import { getWhop } from "@/lib/whop";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event;
  try {
    event = getWhop().webhooks.unwrap(body, { headers });
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  // Idempotency: try to record the event. If it already exists
  // (unique constraint on id), we've already processed it.
  try {
    await prisma.webhookEvent.create({ data: { id: event.id } });
  } catch {
    return new Response("Already processed", { status: 200 });
  }

  if (event.type === "membership.activated") {
    await handleMembershipActivated(event.data, event.id);
  }

  if (event.type === "membership.deactivated") {
    await handleMembershipDeactivated(event.data, event.id);
  }

  return new Response("OK", { status: 200 });
}

async function handleMembershipActivated(
  membership: {
    id: string;
    user?: { id: string } | null;
    product: { id: string };
    renewal_period_start: string | null;
    renewal_period_end: string | null;
  },
  eventId: string
) {
  const whopUserId = membership.user?.id;
  if (!whopUserId) return;

  const user = await prisma.user.findUnique({ where: { whopUserId } });
  if (!user) return;

  // Look up the plan by Whop product ID
  const plan = await prisma.plan.findUnique({
    where: { whopProductId: membership.product.id },
  });
  if (!plan) return;

  await prisma.membership.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      planId: plan.id,
      status: "ACTIVE",
      whopMembershipId: membership.id,
      periodStart: parseTimestamp(membership.renewal_period_start),
      periodEnd: parseTimestamp(membership.renewal_period_end),
      lastWebhookEventId: eventId,
    },
    update: {
      planId: plan.id,
      status: "ACTIVE",
      whopMembershipId: membership.id,
      periodStart: parseTimestamp(membership.renewal_period_start),
      periodEnd: parseTimestamp(membership.renewal_period_end),
      lastWebhookEventId: eventId,
    },
  });
}

async function handleMembershipDeactivated(
  membership: { user?: { id: string } | null },
  eventId: string
) {
  const whopUserId = membership.user?.id;
  if (!whopUserId) return;

  const user = await prisma.user.findUnique({ where: { whopUserId } });
  if (!user) return;

  await prisma.membership.updateMany({
    where: { userId: user.id },
    data: {
      status: "CANCELLED",
      lastWebhookEventId: eventId,
    },
  });
}

function parseTimestamp(value: string | null): Date | null {
  if (!value) return null;
  const num = Number(value);
  if (!isNaN(num) && num > 0) return new Date(num * 1000);
  return new Date(value);
}
