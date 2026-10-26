import type { NextRequest } from "next/server";
import { unwrapWebhook } from "@whop/sdk/helpers";
import { prisma } from "@/lib/prisma";

type WhopWebhookEvent = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event: WhopWebhookEvent;
  try {
    event = unwrapWebhook<WhopWebhookEvent>(body, {
      headers,
      key: process.env.WHOP_WEBHOOK_SECRET,
    });
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

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

// Webhooks pinned to a recent API version send flat fields (user_id, product_id,
// current_period_start). Unpinned webhooks send the older shape (user.id,
// product.id, renewal_period_start). We read both.
function readString(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

function readNestedId(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  if (value && typeof value === "object") {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string") return id;
  }
  return null;
}

async function handleMembershipActivated(
  membership: Record<string, unknown>,
  eventId: string
) {
  const membershipId = readString(membership, "id");
  const whopUserId =
    readString(membership, "user_id") ?? readNestedId(membership, "user");
  const whopProductId =
    readString(membership, "product_id") ?? readNestedId(membership, "product");
  if (!membershipId || !whopUserId || !whopProductId) return;

  const periodStart =
    readString(membership, "current_period_start") ??
    readString(membership, "renewal_period_start");
  const periodEnd =
    readString(membership, "current_period_end") ??
    readString(membership, "renewal_period_end");

  const user = await prisma.user.findUnique({ where: { whopUserId } });
  if (!user) return;

  const plan = await prisma.plan.findUnique({
    where: { whopProductId },
  });
  if (!plan) return;

  await prisma.membership.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      planId: plan.id,
      status: "ACTIVE",
      whopMembershipId: membershipId,
      periodStart: parseTimestamp(periodStart),
      periodEnd: parseTimestamp(periodEnd),
      lastWebhookEventId: eventId,
    },
    update: {
      planId: plan.id,
      status: "ACTIVE",
      whopMembershipId: membershipId,
      periodStart: parseTimestamp(periodStart),
      periodEnd: parseTimestamp(periodEnd),
      lastWebhookEventId: eventId,
    },
  });
}

async function handleMembershipDeactivated(
  membership: Record<string, unknown>,
  eventId: string
) {
  const whopUserId =
    readString(membership, "user_id") ?? readNestedId(membership, "user");
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
