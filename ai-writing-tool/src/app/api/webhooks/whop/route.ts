import { NextRequest } from "next/server";
import { unwrapWebhook } from "@whop/sdk/helpers";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

// Webhooks pinned to a recent API version send flat ids (user_id, plan_id).
// Unpinned webhooks nest them (user.id, plan.id). We accept both.
function readId(
  data: Record<string, unknown>,
  flatKey: string,
  nestedKey: string
): string | null {
  const flat = data[flatKey];
  if (typeof flat === "string") return flat;
  const nested = data[nestedKey];
  if (nested && typeof nested === "object") {
    const id = (nested as { id?: unknown }).id;
    if (typeof id === "string") return id;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers = Object.fromEntries(request.headers);

  let webhookData: { type: string; data: Record<string, unknown> };
  try {
    webhookData = unwrapWebhook<{
      type: string;
      data: Record<string, unknown>;
    }>(body, { headers, key: env.WHOP_WEBHOOK_SECRET });
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  const { type, data } = webhookData;

  switch (type) {
    case "membership.activated": {
      const membershipId = data.id as string;
      const userId = readId(data, "user_id", "user");
      const planId = readId(data, "plan_id", "plan");
      if (!userId || !planId) break;

      const existing = await prisma.membership.findUnique({
        where: { whopMembershipId: membershipId },
      });
      if (existing?.lastWebhookEventId === membershipId) break;

      const user = await prisma.user.findUnique({
        where: { whopUserId: userId },
      });

      const plan = await prisma.plan.findFirst({
        where: { whopPlanId: planId },
      });

      if (!user || !plan) break;

      await prisma.membership.upsert({
        where: { whopMembershipId: membershipId },
        update: {
          status: "ACTIVE",
          lastWebhookEventId: membershipId,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        create: {
          userId: user.id,
          planId: plan.id,
          whopMembershipId: membershipId,
          status: "ACTIVE",
          lastWebhookEventId: membershipId,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      break;
    }

    case "membership.deactivated": {
      const membershipId = data.id as string;
      await prisma.membership.updateMany({
        where: { whopMembershipId: membershipId },
        data: { status: "CANCELLED", cancelAtPeriodEnd: false },
      });
      break;
    }

    case "membership.cancel_at_period_end_changed": {
      const membershipId = data.id as string;
      const cancelAtPeriodEnd = data.cancel_at_period_end as boolean;
      await prisma.membership.updateMany({
        where: { whopMembershipId: membershipId },
        data: { cancelAtPeriodEnd },
      });
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
