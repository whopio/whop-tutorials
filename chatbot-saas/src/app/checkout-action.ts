"use server";

import { requireAuth } from "@/lib/auth";
import { getCompanyWhop } from "@/lib/whop";

export async function createCheckoutUrl(whopPlanId: string): Promise<string> {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const config = await getCompanyWhop().checkoutConfigurations.create({
    plan_id: whopPlanId,
    redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/chat`,
  });

  return config.purchase_url;
}
