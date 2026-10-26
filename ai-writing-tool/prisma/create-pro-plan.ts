import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { WhopClient, WhopEnvironment } from "@whop/sdk";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const isSandbox = process.env.WHOP_SANDBOX === "true";

const whop = new WhopClient({
  token: process.env.WHOP_API_KEY!,
  environment: isSandbox
    ? WhopEnvironment.Sandbox
    : WhopEnvironment.Production,
});

async function main() {
  const companyId = process.env.WHOP_COMPANY_ID;
  if (!companyId) throw new Error("WHOP_COMPANY_ID is not set");

  console.log("Creating 'Pencraft Pro' product on Whop...");
  const product = await whop.products.create({
    account_id: companyId,
    title: "Pencraft Pro",
    description: "All 8 writing templates and unlimited generations.",
  });

  console.log("Creating monthly $20 plan...");
  const plan = await whop.plans.create({
    account_id: companyId,
    product_id: product.id,
    billing_period: 30,
    currency: "usd",
    // On a renewal plan, initial_price is charged on top of the first renewal_price.
    // 0 keeps the first charge at the monthly price.
    initial_price: 0,
    renewal_price: 20,
  });

  const checkoutBase = isSandbox ? "sandbox.whop.com" : "whop.com";
  const checkoutUrl = `https://${checkoutBase}/checkout/${plan.id}`;

  await prisma.plan.upsert({
    where: { id: "pro-plan" },
    update: {
      name: "Pro",
      price: 2000,
      whopProductId: product.id,
      whopPlanId: plan.id,
      checkoutUrl,
      isActive: true,
    },
    create: {
      id: "pro-plan",
      name: "Pro",
      price: 2000,
      whopProductId: product.id,
      whopPlanId: plan.id,
      checkoutUrl,
      isActive: true,
    },
  });

  console.log("Done.");
  console.log("  Product ID:", product.id);
  console.log("  Plan ID:   ", plan.id);
  console.log("  Checkout:  ", checkoutUrl);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
