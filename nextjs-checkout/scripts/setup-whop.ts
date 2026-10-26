import { config } from "dotenv";
import { WhopClient } from "@whop/sdk";

config({ path: ".env.local" });
config();

const apiKey = process.env.WHOP_COMPANY_API_KEY;
const sandbox = process.env.WHOP_SANDBOX === "true";
const explicitCompanyId = process.env.WHOP_COMPANY_ID;

if (!apiKey) {
  console.error("Set WHOP_COMPANY_API_KEY in .env.local before running this script.");
  process.exit(1);
}

const whop = new WhopClient({
  token: apiKey,
  ...(sandbox && { baseUrl: "https://sandbox-api.whop.com/api/v1" }),
});

async function resolveCompanyId(): Promise<string> {
  if (explicitCompanyId) return explicitCompanyId;
  try {
    const account = await whop.accounts.me();
    return account.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("company:basic:read")) {
      throw new Error(
        "Your Company API Key cannot read its company (missing company:basic:read scope). " +
          "Set WHOP_COMPANY_ID=biz_... (find it in the Whop dashboard URL) and run this again.",
      );
    }
    throw err;
  }
}

async function main() {
  const companyId = await resolveCompanyId();
  console.log(`Using company: ${companyId}\n`);

  const product = await whop.products.create({
    account_id: companyId,
    title: "Pro",
    visibility: "hidden",
  });
  const productId = (product as { id: string }).id;
  console.log(`Created product: ${productId}`);

  const subscription = await whop.plans.create({
    account_id: companyId,
    product_id: productId,
    plan_type: "renewal",
    initial_price: 0,
    renewal_price: 29,
    billing_period: 30,
    currency: "usd",
    visibility: "hidden",
    release_method: "buy_now",
  });
  const subscriptionId = (subscription as { id: string }).id;

  const lifetime = await whop.plans.create({
    account_id: companyId,
    product_id: productId,
    plan_type: "one_time",
    initial_price: 199,
    currency: "usd",
    visibility: "hidden",
    release_method: "buy_now",
  });
  const lifetimeId = (lifetime as { id: string }).id;

  console.log("\nAdd these to your .env.local:");
  console.log(`NEXT_PUBLIC_WHOP_SUBSCRIPTION_PLAN_ID=${subscriptionId}`);
  console.log(`NEXT_PUBLIC_WHOP_LIFETIME_PLAN_ID=${lifetimeId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
