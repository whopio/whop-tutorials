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

const PRODUCT_TITLE = "Promo demo pass";
const PRICE = 40;

// The demo does not let visitors create codes: a promo code cannot be updated
// and archiving is permanent, so an open create form would silt the company up
// with junk nobody can ever clean out. These three are seeded once and picked
// from instead. One small percentage, one large one, and a flat amount, which
// is the set that makes the encoding difference visible.
//
// All three are unlimited and repeatable on purpose. A stock limit cannot be
// topped back up, so a capped code would be dead the moment it ran out.
const SEED_CODES = [
  {
    code: "SAVE25",
    promo_type: "percentage",
    amount_off: 25,
    note: "A quarter off, the everyday case.",
  },
  {
    code: "HALFOFF",
    promo_type: "percentage",
    amount_off: 50,
    note: "A big percentage, so the math is obvious on the receipt.",
  },
  {
    // 15 rather than 10: a $10 discount on a $40 item lands on the same $30 as
    // SAVE25, and two codes with different kinds reaching the same price is
    // precisely the comparison this set exists to make.
    code: "FIFTEENOFF",
    promo_type: "flat_amount",
    amount_off: 15,
    note: "A flat amount, which survives the round trip unchanged.",
  },
];

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
        "The thing the promo codes discount. Priced high enough that a percentage off is obvious on the receipt.",
      visibility: "visible",
    });
    console.log("Created product", product.id);
  } else {
    console.log("Found product", product.id);
  }

  let plan = null;
  for await (const p of await whop.plans.list({
    account_id: companyId,
    product_ids: [product.id],
  })) {
    if (p.plan_type === "one_time" && p.initial_price === PRICE) {
      plan = p;
      break;
    }
  }
  if (!plan) {
    plan = await whop.plans.create({
      account_id: companyId,
      product_id: product.id,
      plan_type: "one_time",
      initial_price: PRICE,
      visibility: "visible",
    });
    console.log("Created plan", plan.id);
  } else {
    console.log("Found plan", plan.id);
  }

  // Seed the pickable codes. Whop lowercases every code, so compare that way.
  const existing = new Map();
  for await (const promo of await whop.promoCodes.list({ account_id: companyId })) {
    if (promo.code) existing.set(promo.code.toLowerCase(), promo);
  }

  const seeded = [];
  for (const seed of SEED_CODES) {
    const found = existing.get(seed.code.toLowerCase());
    if (found && found.status !== "archived") {
      console.log("Found promo code", found.code);
      seeded.push({ ...seed, id: found.id, code: found.code });
      continue;
    }
    if (found) {
      // Archiving a code releases its string, so a seed that someone archived
      // can be minted again under the same name. It comes back with a new id,
      // which is why the id always gets rewritten below rather than reused.
      console.log("Re-creating archived promo code", seed.code);
    }
    const created = await whop.promoCodes.create({
      account_id: companyId,
      code: seed.code,
      promo_type: seed.promo_type,
      amount_off: seed.amount_off,
      base_currency: "usd",
      new_users_only: false,
      promo_duration_months: 1,
      unlimited_stock: true,
      // Repeatable on purpose: a demo everyone shares cannot spend its codes.
      one_per_customer: false,
      product_id: product.id,
    });
    console.log("Created promo code", created.code);
    seeded.push({ ...seed, id: created.id, code: created.code });
  }

  const codeLines = seeded
    .map(
      (s) =>
        `    { id: "${s.id}", code: "${s.code}", note: ${JSON.stringify(s.note)} },`,
    )
    .join("\n");

  const file = `// Written by scripts/setup.mjs. Do not edit by hand.
export const WHOP_IDS = {
  productId: "${product.id}",
  planId: "${plan.id}",
  price: ${plan.initial_price ?? PRICE},
  purchaseUrl: "${plan.purchase_url ?? ""}",
  // The codes this demo offers. Visitors pick from these; nothing here
  // creates or destroys a promo code at runtime.
  promoCodes: [
${codeLines}
  ],
} as const;
`;
  writeFileSync(new URL("../constants/whop-ids.ts", import.meta.url), file);
  console.log("Wrote constants/whop-ids.ts");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
