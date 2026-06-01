/**
 * One-shot: flip seeded users' avatar URLs from /seed/authors/*.png to .webp.
 * Run after `scripts/convert-authors.mjs` has produced the new WebP files.
 *   npx tsx scripts/migrate-avatars.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const users = await prisma.user.findMany({
    where: { avatar: { contains: "/seed/authors/" } },
    select: { id: true, username: true, avatar: true },
  });

  console.log(`Found ${users.length} seeded users with author avatars`);

  let updated = 0;
  for (const u of users) {
    if (u.avatar && u.avatar.endsWith(".png")) {
      const next = u.avatar.replace(/\.png$/, ".webp");
      await prisma.user.update({ where: { id: u.id }, data: { avatar: next } });
      console.log(`@${u.username}: ${u.avatar} -> ${next}`);
      updated++;
    }
  }
  console.log(`\nUpdated ${updated} rows.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
