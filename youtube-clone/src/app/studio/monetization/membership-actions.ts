"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { whopCompany } from "@/lib/whop";

const tierSchema = z.object({
  name: z.string().trim().min(1, "Add a tier name").max(50),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  // Stored as cents in our DB; Whop wants dollars. $1–$1000.
  priceCents: z.number().int().min(100).max(100_000),
});

export type TierResult = { ok: true } | { error: string };

/**
 * MEMBERSHIP-1/2: define a membership tier and map it to a Whop **renewal plan**
 * on the creator's connected account (monthly billing). We create one shared
 * Whop product per channel, then a plan per tier. Our application fee is applied
 * later, on the Join checkout (TIPS/MEMBERSHIP-4); plans don't carry it.
 */
export async function createTier(input: {
  name: string;
  description?: string;
  priceCents: number;
}): Promise<TierResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };

  const channel = await prisma.channel.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      whopCompanyId: true,
      membershipsEnabled: true,
    },
  });
  if (!channel) return { error: "Create a channel first." };
  if (!channel.whopCompanyId) {
    return { error: "Enable monetization before adding tiers." };
  }

  const parsed = tierSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid tier." };
  }
  const { name, description, priceCents } = parsed.data;

  try {
    // Reuse the channel's existing Whop product, or create it on the first tier.
    const existing = await prisma.membershipTier.findFirst({
      where: { channelId: channel.id, whopProductId: { not: null } },
      select: { whopProductId: true },
    });
    let productId = existing?.whopProductId ?? null;
    if (!productId) {
      const product = await whopCompany.products.create({
        company_id: channel.whopCompanyId,
        title: `${channel.name} Memberships`,
        visibility: "visible",
      });
      productId = product.id;
    }

    const dollars = priceCents / 100;
    // Hidden: joins must go through OUR checkout (which carries the
    // application fee + the metadata the webhook needs), never a direct
    // purchase from the plan's public Whop page.
    const plan = await whopCompany.plans.create({
      company_id: channel.whopCompanyId,
      product_id: productId,
      plan_type: "renewal",
      initial_price: dollars,
      renewal_price: dollars,
      billing_period: 30,
      currency: "usd",
      visibility: "hidden",
      release_method: "buy_now",
    });

    await prisma.membershipTier.create({
      data: {
        channelId: channel.id,
        name,
        description: description ? description : null,
        priceCents,
        whopProductId: productId,
        whopPlanId: plan.id,
      },
    });

    if (!channel.membershipsEnabled) {
      await prisma.channel.update({
        where: { id: channel.id },
        data: { membershipsEnabled: true },
      });
    }
  } catch (err) {
    console.error("createTier failed:", err);
    return { error: "Could not create the tier. Please try again." };
  }

  revalidatePath("/studio/monetization");
  return { ok: true };
}
