"use server";

import { prisma } from "./prisma";
import { getCurrentUser } from "./session";
import { whopCompany } from "./whop";
import { platformFeeCents, toDollars } from "./money";

export type CheckoutResult = { sessionId: string } | { error: string };

/**
 * MEMBERSHIP-4: create a one-time-configured embedded checkout for a tier on the
 * creator's connected account. The charge is a renewal (subscription) with our
 * application fee on the inline plan; the connected account is merchant of
 * record. Metadata is copied onto the payment + membership so the webhook can
 * grant the entitlement (MEMBERSHIP-5) without mapping Whop ids back.
 */
export async function createMembershipCheckout(
  tierId: string,
): Promise<CheckoutResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };

  const tier = await prisma.membershipTier.findUnique({
    where: { id: tierId },
    select: {
      id: true,
      priceCents: true,
      whopProductId: true,
      channel: {
        select: {
          id: true,
          userId: true,
          whopCompanyId: true,
          membershipsEnabled: true,
        },
      },
    },
  });
  if (
    !tier ||
    !tier.channel.membershipsEnabled ||
    !tier.channel.whopCompanyId ||
    !tier.whopProductId
  ) {
    return { error: "Memberships aren't available for this channel." };
  }
  if (tier.channel.userId === user.id) {
    return { error: "You can't join your own channel." };
  }

  const membership = await prisma.channelMember.findUnique({
    where: {
      userId_channelId: { userId: user.id, channelId: tier.channel.id },
    },
    select: { status: true },
  });
  if (membership?.status === "ACTIVE") {
    return { error: "You're already a member of this channel." };
  }

  const amountCents = tier.priceCents;
  const feeCents = platformFeeCents(amountCents);

  try {
    const config = await whopCompany.checkoutConfigurations.create({
      mode: "payment",
      metadata: {
        kind: "membership",
        channelId: tier.channel.id,
        tierId: tier.id,
        viewerUserId: user.id,
        amountCents: String(amountCents),
        feeCents: String(feeCents),
      },
      plan: {
        company_id: tier.channel.whopCompanyId,
        product_id: tier.whopProductId,
        plan_type: "renewal",
        initial_price: toDollars(amountCents),
        renewal_price: toDollars(amountCents),
        billing_period: 30,
        currency: "usd",
        visibility: "hidden",
        release_method: "buy_now",
        application_fee_amount: toDollars(feeCents),
      },
    });
    return { sessionId: config.id };
  } catch (err) {
    console.error("createMembershipCheckout failed:", err);
    return { error: "Could not start checkout. Please try again." };
  }
}

/**
 * TIPS-6: create a one-time Cheers checkout on the creator's connected
 * account with our application fee. The video stays free; this is a tip.
 */
export async function createTipCheckout(
  videoId: string,
  amountCents: number,
  message: string,
): Promise<CheckoutResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  if (!Number.isInteger(amountCents) || amountCents < 100 || amountCents > 50_000) {
    return { error: "Pick a valid amount." };
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      channel: {
        select: {
          id: true,
          userId: true,
          whopCompanyId: true,
          superThanksEnabled: true,
        },
      },
    },
  });
  if (
    !video ||
    !video.channel.whopCompanyId ||
    !video.channel.superThanksEnabled
  ) {
    return { error: "Cheers isn't available for this video." };
  }
  if (video.channel.userId === user.id) {
    return { error: "You can't tip your own video." };
  }

  const feeCents = platformFeeCents(amountCents);

  try {
    const config = await whopCompany.checkoutConfigurations.create({
      mode: "payment",
      metadata: {
        kind: "tip",
        channelId: video.channel.id,
        videoId: video.id,
        viewerUserId: user.id,
        message: message.trim().slice(0, 200),
        amountCents: String(amountCents),
        feeCents: String(feeCents),
      },
      plan: {
        company_id: video.channel.whopCompanyId,
        plan_type: "one_time",
        initial_price: toDollars(amountCents),
        currency: "usd",
        visibility: "hidden",
        release_method: "buy_now",
        application_fee_amount: toDollars(feeCents),
      },
    });
    return { sessionId: config.id };
  } catch (err) {
    console.error("createTipCheckout failed:", err);
    return { error: "Could not start checkout. Please try again." };
  }
}
