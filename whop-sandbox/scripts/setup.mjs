// Provisions the sandbox product this demo sells and writes the ids to
// constants/whop-ids.ts. Idempotent: re-running finds the existing product
// by title instead of creating duplicates.
//
// Run with: npm run setup   (alias for: node --env-file=.env.local scripts/setup.mjs)

import { writeFileSync } from "node:fs";
import { WhopClient, WhopEnvironment } from "@whop/sdk";

const token = process.env.WHOP_COMPANY_API_KEY;
const accountId = process.env.WHOP_COMPANY_ID;
if (!token || !accountId) {
  console.error("Set WHOP_COMPANY_API_KEY and WHOP_COMPANY_ID in .env.local first.");
  process.exit(1);
}

const whop = new WhopClient({
  token,
  environment:
    process.env.WHOP_SANDBOX === "true"
      ? WhopEnvironment.Sandbox
      : WhopEnvironment.Production,
});

const PRODUCT_TITLE = "Demo product";

async function main() {
  let product = null;
  for await (const p of await whop.products.list({ account_id: accountId })) {
    if (p.title === PRODUCT_TITLE) {
      product = p;
      break;
    }
  }
  if (!product) {
    product = await whop.products.create({
      account_id: accountId,
      title: PRODUCT_TITLE,
      description:
        "The product under test. Exists to be bought, declined, and refunded with test cards.",
      visibility: "visible",
    });
    console.log("Created product", product.id);
  } else {
    console.log("Found product", product.id);
  }

  // Variants are what the API used to call plans. Their ids still start
  // with plan_, and the checkout embed still takes them as planId.
  let plan = null;
  for await (const v of await whop.variants.list({
    account_id: accountId,
    product_ids: [product.id],
  })) {
    if (v.plan_type === "one_time" && v.initial_price === 10) {
      plan = v;
      break;
    }
  }
  if (!plan) {
    plan = await whop.variants.create({
      account_id: accountId,
      product_id: product.id,
      plan_type: "one_time",
      initial_price: 10,
      visibility: "visible",
    });
    console.log("Created plan", plan.id);
  } else {
    console.log("Found plan", plan.id);
  }

  const file = `export const WHOP_IDS = {
  productId: "${product.id}",
  planId: "${plan.id}",
} as const;
`;
  writeFileSync(new URL("../constants/whop-ids.ts", import.meta.url), file);
  console.log("Wrote constants/whop-ids.ts");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
