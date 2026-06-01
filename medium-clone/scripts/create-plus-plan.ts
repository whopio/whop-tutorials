// One-shot script to create the Storyline Plus product + plan.
// Run with: npx tsx scripts/create-plus-plan.ts
//
// Outputs an env line for STORYLINE_PLUS_PLAN_ID — paste it into Vercel and
// re-run `vercel env pull .env.local`.

import { config } from "dotenv";
config({ path: ".env.local" });

import { getCompanyWhop } from "../src/lib/whop";

const PRICE_USD = Number(process.env.STORYLINE_PLUS_MONTHLY_PRICE || "5");

async function main() {
  const companyId = process.env.WHOP_COMPANY_ID;
  if (!companyId) throw new Error("WHOP_COMPANY_ID is not set");

  const whop = getCompanyWhop();

  const product = await whop.products.create({
    company_id: companyId,
    title: "Storyline Plus",
    description: "Unlimited access to every Plus story on Storyline.",
  });
  console.log(`Created product: ${product.id}`);

  const plan = await whop.plans.create({
    company_id: companyId,
    product_id: product.id,
    plan_type: "renewal",
    initial_price: PRICE_USD,
    renewal_price: PRICE_USD,
    billing_period: 30,
    currency: "usd",
  });
  console.log(`Created plan: ${plan.id}`);

  console.log("\nAdd this to Vercel (Environment Variables), then run `vercel env pull .env.local`:");
  console.log(`STORYLINE_PLUS_PLAN_ID=${plan.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
