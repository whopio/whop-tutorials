import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const deleted = await prisma.user.deleteMany({
    where: { whopUserId: { startsWith: "seed_user_" } },
  });
  console.log(`✓ Removed ${deleted.count} seeded users (and everything they owned).`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
