// Provisions the sandbox product this demo sells and writes the ids to
// constants/whop-ids.ts. Idempotent: re-running finds the existing product
// by title instead of creating duplicates.
//
// Run with: npm run setup   (alias for: node --env-file=.env.local scripts/setup.mjs)

import { writeFileSync } from "node:fs";
import { WhopClient, WhopEnvironment } from "@whop/sdk";

const apiKey = process.env.WHOP_COMPANY_API_KEY;
const companyId = process.env.WHOP_COMPANY_ID;
if (!apiKey || !companyId) {
  console.error("Set WHOP_COMPANY_API_KEY and WHOP_COMPANY_ID in .env.local first.");
  process.exit(1);
}

const whop = new WhopClient({
  token: apiKey,
  environment:
    process.env.WHOP_SANDBOX === "true"
      ? WhopEnvironment.Sandbox
      : WhopEnvironment.Production,
});

const PRODUCT_TITLE = "Demo pass";

async function main() {
  let product = null;
  for await (const p of await whop.products.list({ account_id: companyId })) {
    if (p.title === PRODUCT_TITLE) {
      product = p;
      break;
    }
  }
  if (!product) {
    product = await whop.products.create({
      account_id: companyId,
      title: PRODUCT_TITLE,
      description:
        "The product under test in the express checkout demo. Bought through the one-click checkout button, twice.",
      visibility: "visible",
    });
    console.log("Created product", product.id);
  } else {
    console.log("Found product", product.id);
  }

  let plan = null;
  for await (const p of await whop.variants.list({
    account_id: companyId,
    product_ids: [product.id],
  })) {
    if (p.plan_type === "one_time" && p.initial_price === 5) {
      plan = p;
      break;
    }
  }
  if (!plan) {
    plan = await whop.variants.create({
      account_id: companyId,
      product_id: product.id,
      plan_type: "one_time",
      initial_price: 5,
      visibility: "visible",
    });
    console.log("Created plan", plan.id);
  } else {
    console.log("Found plan", plan.id);
  }

  const file = `// Written by scripts/setup.mjs. Do not edit by hand.
export const WHOP_IDS = {
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
