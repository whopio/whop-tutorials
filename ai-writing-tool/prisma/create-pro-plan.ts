import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import Whop from "@whop/sdk";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const isSandbox = process.env.WHOP_SANDBOX === "true";

const whop = new Whop({
  apiKey: process.env.WHOP_API_KEY!,
  baseURL: isSandbox
    ? "https://sandbox-api.whop.com/api/v1"
    : "https://api.whop.com/api/v1",
});

async function main() {
  const companyId = process.env.WHOP_COMPANY_ID;
  if (!companyId) throw new Error("WHOP_COMPANY_ID is not set");

  console.log("Creating 'Pencraft Pro' product on Whop...");
  const product = await whop.products.create({
    company_id: companyId,
    title: "Pencraft Pro",
    description: "All 8 writing templates and unlimited generations.",
  });

  console.log("Creating monthly $20 plan...");
  const plan = await whop.plans.create({
    company_id: companyId,
    product_id: product.id,
    billing_period: 30,
    currency: "usd",
    initial_price: 20,
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
