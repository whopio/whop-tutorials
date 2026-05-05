"use server";

import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";
import { redirect } from "next/navigation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function createCheckout(
  creatorId: string
): Promise<{ error: string }> {
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
  });

  if (!creator) return { error: "Creator not found" };
  if (!creator.whopCompanyId) return { error: "Creator has not enabled earnings" };

  const priceInDollars = creator.unlockPrice / 100;
  const feeInDollars = creator.applicationFee / 100;

  // Create a pending Unlock record so the webhook can find it by payment ID
  const unlock = await prisma.unlock.create({
    data: {
      creatorId: creator.id,
      status: "PENDING",
    },
  });

  const checkout = await whop.checkoutConfigurations.create({
    plan: {
      company_id: creator.whopCompanyId,
      currency: "usd",
      plan_type: "one_time",
      initial_price: priceInDollars,
      application_fee_amount: feeInDollars,
    },
    redirect_url: `${APP_URL}/api/checkout/verify?handle=${encodeURIComponent(
      creator.handle
    )}&unlock_id=${unlock.id}`,
    metadata: { unlock_id: unlock.id, creator_id: creator.id },
  });

  redirect(checkout.purchase_url);
}
