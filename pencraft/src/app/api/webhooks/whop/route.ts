import { NextRequest } from "next/server";
import Whop from "@whop/sdk";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const whopWebhook = new Whop({
  apiKey: env.WHOP_API_KEY,
  webhookKey: btoa(env.WHOP_WEBHOOK_SECRET),
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers = Object.fromEntries(request.headers);

  let webhookData: { type: string; data: Record<string, unknown> };
  try {
    webhookData = whopWebhook.webhooks.unwrap(body, { headers }) as unknown as {
      type: string;
      data: Record<string, unknown>;
    };
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  const { type, data } = webhookData;

  switch (type) {
    case "membership.activated": {
      const membershipId = data.id as string;
      const userId = data.user_id as string;
      const planId = data.plan_id as string;

      // Idempotency: check if we already processed this event
      const existing = await prisma.membership.findUnique({
        where: { whopMembershipId: membershipId },
      });
      if (existing?.lastWebhookEventId === membershipId) break;

      // Find the user and plan in our database
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
