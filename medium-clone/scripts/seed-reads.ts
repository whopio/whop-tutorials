/**
 * Dev helper: simulate Plus-on-Plus reads so you can trigger the monthly cron
 * locally and watch transfers flow without waiting a real month.
 *
 * Usage:
 *   npx tsx scripts/seed-reads.ts [--month YYYY-MM] [--reads-per-plus-story 5]
 *
 * It walks every PLUS published story and inserts a StoryRead row for each
 * active Plus member (other than the author), bucketed to the target month.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

function lastMonthBucket(): string {
  const d = new Date();
  const lm = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  return `${lm.getUTCFullYear()}-${String(lm.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out: { month?: string; readsPerStory?: number } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--month") out.month = args[++i];
    if (args[i] === "--reads-per-plus-story") out.readsPerStory = Number(args[++i]);
  }
  return out;
}

async function main() {
  const { month: overrideMonth, readsPerStory } = parseArgs();
  const monthBucket = overrideMonth ?? lastMonthBucket();
  const maxReads = readsPerStory ?? Infinity;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const plusMembers = await prisma.user.findMany({
      where: { plusMembership: { status: "ACTIVE" } },
      select: { id: true },
    });
    if (plusMembers.length === 0) {
      console.log("No active Plus members to simulate reads from.");
      return;
    }

    const stories = await prisma.story.findMany({
      where: { status: "PUBLISHED", visibility: "PLUS" },
      select: { id: true, authorUserId: true, title: true },
    });
    if (stories.length === 0) {
      console.log("No PLUS stories to simulate reads on.");
      return;
    }

    let inserted = 0;
    for (const story of stories) {
      const eligible = plusMembers.filter((m) => m.id !== story.authorUserId);
      const slice = eligible.slice(0, Math.min(eligible.length, maxReads));
      for (const member of slice) {
        const result = await prisma.storyRead.upsert({
          where: {
            userId_storyId_monthBucket: {
              userId: member.id,
              storyId: story.id,
              monthBucket,
            },
          },
          create: {
            userId: member.id,
            storyId: story.id,
            monthBucket,
            dwellSeconds: 60,
          },
          update: {},
        });
        if (result) inserted += 1;
      }
    }

    console.log(`Seeded ${inserted} StoryRead rows for ${monthBucket}.`);
    console.log(
      `Trigger the cron: curl -H "Authorization: Bearer $CRON_SECRET" -X POST \\
  http://localhost:3000/api/cron/partner-payout?monthBucket=${monthBucket}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
