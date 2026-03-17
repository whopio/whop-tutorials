"use server";

import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getCompanyWhop } from "@/lib/whop";

export async function createPlan(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const name = (formData.get("name") as string)?.trim();
  const priceStr = (formData.get("price") as string)?.trim();
  const allowCustomBots = formData.get("allowCustomBots") === "on";

  if (!name || !priceStr) {
    throw new Error("Name and price are required.");
  }

  const priceDollars = parseFloat(priceStr);
  if (isNaN(priceDollars) || priceDollars <= 0) {
    throw new Error("Price must be a positive number.");
  }

  // Use the company API key for product/plan creation (requires access_pass:create)
  const whop = getCompanyWhop();
  const companyId = process.env.WHOP_COMPANY_ID!;

  // Create a Whop product for this plan
  const product = await whop.products.create({
    company_id: companyId,
    title: name,
  });

  // Create a monthly pricing plan within the product
  const whopPlan = await whop.plans.create({
    company_id: companyId,
    product_id: product.id,
    renewal_price: priceDollars,
    plan_type: "renewal",
    billing_period: 30,
  });

  await prisma.plan.create({
    data: {
      name,
      price: Math.round(priceDollars * 100),
      whopProductId: product.id,
      whopPlanId: whopPlan.id,
      checkoutUrl: whopPlan.purchase_url,
      allowCustomBots,
    },
  });

  redirect("/admin/plans");
}

export async function togglePlanActive(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const planId = formData.get("planId") as string;
  if (!planId) throw new Error("Plan ID is required.");

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found.");

  await prisma.plan.update({
    where: { id: planId },
    data: { isActive: !plan.isActive },
  });

  redirect("/admin/plans");
}

export async function deletePlan(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const planId = formData.get("planId") as string;
  if (!planId) throw new Error("Plan ID is required.");

  // Check no active memberships use this plan
  const activeMemberships = await prisma.membership.count({
    where: { planId, status: "ACTIVE" },
  });

  if (activeMemberships > 0) {
    throw new Error(
      "Cannot delete a plan with active memberships. Deactivate it instead."
    );
  }

  // Unassign bots from this plan
  await prisma.bot.updateMany({
    where: { planId },
    data: { planId: null },
  });

  await prisma.plan.delete({ where: { id: planId } });

  redirect("/admin/plans");
}
