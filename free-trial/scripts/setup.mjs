import Whop from "@whop/sdk";

const whop = new Whop({
  apiKey: process.env.WHOP_COMPANY_API_KEY,
  baseURL: "https://sandbox-api.whop.com/api/v1",
});

// Your company id, from the dashboard URL: whop.com/dashboard/biz_...
const COMPANY_ID = "biz_...";

const product = await whop.products.create({
  company_id: COMPANY_ID,
  title: "Pro",
  visibility: "visible",
});

const plan = await whop.plans.create({
  product_id: product.id,
  plan_type: "renewal",
  billing_period: 30,
  initial_price: 0,
  renewal_price: 10,
  trial_period_days: 3,
  currency: "usd",
  release_method: "buy_now",
  visibility: "visible",
});

console.log("WHOP_PRO_PRODUCT_ID=" + product.id);
console.log("WHOP_PRO_PLAN_ID=" + plan.id);
