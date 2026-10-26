"use server";

import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { redirect } from "next/navigation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function createCheckout(
  creatorId: string
): Promise<{ error: string }> {
  if (!rateLimit(`checkout:${await clientIp()}`, 20, 60_000)) {
    return { error: "Too many attempts. Try again in a minute." };
  }

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

  // application_fee_amount is accepted by the API but missing from the SDK's
  // types, so we build the inline plan as a variable instead of in place.
  const plan = {
    account_id: creator.whopCompanyId,         // creator's connected account
    currency: "usd",
    plan_type: "one_time" as const,
    initial_price: priceInDollars,
    application_fee_amount: feeInDollars,     // platform cut
  };

  const checkout = await whop.checkoutConfigurations.create({
    plan,
    redirect_url: `${APP_URL}/api/checkout/verify?handle=${encodeURIComponent(
      creator.handle
    )}&unlock_id=${unlock.id}`,
    metadata: { unlock_id: unlock.id, creator_id: creator.id },
  });

  if (!checkout.purchase_url) return { error: "Checkout could not be created" };

  redirect(checkout.purchase_url);
}
