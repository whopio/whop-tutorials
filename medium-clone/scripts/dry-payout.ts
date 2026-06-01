/**
 * Dry-run of the partner-payout cron's split logic against seeded reads.
 * Does NOT call whop.transfers.create — just prints what the math would do.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const buckets = ["2026-03", "2026-04", "2026-05"];

  for (const monthBucket of buckets) {
    const readsByStory = await prisma.storyRead.groupBy({
      by: ["storyId"],
      where: { monthBucket },
      _count: { _all: true },
    });

    if (readsByStory.length === 0) {
      console.log(`${monthBucket}  · 0 reads in bucket`);
      continue;
    }

    const stories = await prisma.story.findMany({
      where: { id: { in: readsByStory.map((r) => r.storyId) } },
      select: { id: true, author: { select: { username: true } } },
    });
    const writerByStory = new Map(stories.map((s) => [s.id, s.author.username]));

    const writerReads = new Map<string, number>();
    for (const r of readsByStory) {
      const username = writerByStory.get(r.storyId);
      if (!username) continue;
      writerReads.set(username, (writerReads.get(username) ?? 0) + r._count._all);
    }

    const totalReads = Array.from(writerReads.values()).reduce((a, b) => a + b, 0);

    // Hypothetical: 100 Plus members × $5 = $500 gross, 70% pool = $350
    const poolCents = 100 * 500 * 70 / 100;

    console.log(
      `\n${monthBucket}  · ${totalReads} reads across ${writerReads.size} writers  · pool $${(poolCents / 100).toFixed(2)}`,
    );

    const rows = Array.from(writerReads.entries())
      .map(([username, reads]) => ({
        username,
        reads,
        shareCents: Math.floor((reads / totalReads) * poolCents),
      }))
      .sort((a, b) => b.shareCents - a.shareCents);

    for (const r of rows) {
      const u = ("@" + r.username).padEnd(16);
      const reads = String(r.reads).padStart(3);
      const share = `$${(r.shareCents / 100).toFixed(2)}`.padStart(8);
      console.log(`  ${u}  ${reads} reads  →  ${share}`);
    }
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
