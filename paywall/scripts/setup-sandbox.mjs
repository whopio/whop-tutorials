// One-off sandbox setup: creates a one-time product + plan for the per-post
// unlock. Reads credentials from .env.local.
// Run from the project root: node scripts/setup-sandbox.mjs
import { readFileSync } from "node:fs";
import Whop from "@whop/sdk";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const whop = new Whop({
  apiKey: env.WHOP_COMPANY_API_KEY,
  baseURL: "https://sandbox-api.whop.com/api/v1",
});

// 1. Create the recurring Pro plan on your subscription product (in the
// dashboard or via whop.plans.create) and set its id as WHOP_PRO_PLAN_ID.

// 2. One-time product + plan for the individually sellable post.
const postProduct = await whop.products.create({
  company_id: env.WHOP_COMPANY_ID,
  title: "Pricing teardown: what 50 top SaaS apps actually charge",
  description:
    "One-time unlock of the pricing teardown post on the Pulse paywall demo.",
  visibility: "visible",
});
console.log("POST_PRODUCT_ID=" + postProduct.id);

const postPlan = await whop.plans.create({
  product_id: postProduct.id,
  plan_type: "one_time",
  initial_price: 5,
  release_method: "buy_now",
  visibility: "visible",
});
console.log("POST_PLAN_ID=" + postPlan.id);
