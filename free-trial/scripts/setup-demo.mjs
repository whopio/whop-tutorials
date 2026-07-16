// Provisions the demo's two products on your sandbox company and prints the
// four ids for constants/products.ts. Needs WHOP_COMPANY_API_KEY (with the
// access_pass:create permission) and WHOP_COMPANY_ID in .env.local. Run once:
//   node --env-file=.env.local scripts/setup-demo.mjs
import Whop from "@whop/sdk";

const whop = new Whop({
  apiKey: process.env.WHOP_COMPANY_API_KEY,
  baseURL: "https://sandbox-api.whop.com/api/v1",
});

const COMPANY_ID = process.env.WHOP_COMPANY_ID;
if (!COMPANY_ID?.startsWith("biz_")) {
  console.error("Set WHOP_COMPANY_ID=biz_... in .env.local (it is in your dashboard URL).");
  process.exit(1);
}

// Northwind Pro: the recurring plan that carries the 3-day free trial.
const trialProduct = await whop.products.create({
  company_id: COMPANY_ID,
  title: "Northwind Pro",
  description: "The full Northwind toolkit, billed monthly.",
  visibility: "visible",
});
const trialPlan = await whop.plans.create({
  product_id: trialProduct.id,
  plan_type: "renewal",
  billing_period: 30,
  initial_price: 0,
  renewal_price: 10,
  trial_period_days: 3,
  currency: "usd",
  release_method: "buy_now",
  visibility: "visible",
});

// Northwind Lifetime: a one-time foil, which cannot carry a free trial
// (trials are recurring-only). The demo's first step teaches exactly that.
const foilProduct = await whop.products.create({
  company_id: COMPANY_ID,
  title: "Northwind Lifetime",
  description: "One-time lifetime license. One-time, so no free trial.",
  visibility: "visible",
});
const foilPlan = await whop.plans.create({
  product_id: foilProduct.id,
  plan_type: "one_time",
  initial_price: 149,
  currency: "usd",
  release_method: "buy_now",
  visibility: "visible",
});

console.log("Paste into constants/products.ts:");
console.log("  trial productId: " + trialProduct.id);
console.log("  trial planId:    " + trialPlan.id);
console.log("  foil productId:  " + foilProduct.id);
console.log("  foil planId:     " + foilPlan.id);
console.log("\nAnd into .env.local:");
console.log("  WHOP_PRO_PRODUCT_ID=" + trialProduct.id);
console.log("  WHOP_PRO_PLAN_ID=" + trialPlan.id);
