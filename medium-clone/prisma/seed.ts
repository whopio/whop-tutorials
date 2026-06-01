import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";
import { SEED_WRITERS } from "./seed-content/writers";
import { SEED_STORIES } from "./seed-content/stories";
import {
  SEED_READERS,
  STORY_LIKE_TOTALS,
  STORY_READ_COUNTS,
  WRITER_FOLLOWS,
  FOLLOW_ROOT_OPERATOR_FROM,
  mulberry32,
  sampleN,
  monthBucketOf,
  dateDaysAgo,
} from "./seed-content/engagement";
import { paywallPos, excerpt, readingMinutes } from "./seed-content/tiptap";

config({ path: ".env.local" });

const TOPICS = [
  { slug: "programming", name: "Programming" },
  { slug: "technology", name: "Technology" },
  { slug: "design", name: "Design" },
  { slug: "ux", name: "UX" },
  { slug: "product-management", name: "Product Management" },
  { slug: "startups", name: "Startups" },
  { slug: "productivity", name: "Productivity" },
  { slug: "self-improvement", name: "Self-improvement" },
  { slug: "writing", name: "Writing" },
  { slug: "books", name: "Books" },
  { slug: "money", name: "Money" },
  { slug: "career", name: "Career" },
  { slug: "science", name: "Science" },
  { slug: "health", name: "Health" },
  { slug: "climate", name: "Climate" },
  { slug: "culture", name: "Culture" },
  { slug: "music", name: "Music" },
  { slug: "film", name: "Film" },
  { slug: "sports", name: "Sports" },
];

const LEGACY_STORY_SLUG_RENAMES = [
  {
    authorHandle: "priyaraman",
    from: "saas-made-4300-un" + "se" + "xy-spreadsheet",
    to: "saas-made-4300-actual-spreadsheet",
  },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  /* ─────────────────────────── Topics ─────────────────────────── */

  // Drop politics if it lingers from a prior seed (cascade kills any StoryTopic
  // rows that referenced it; none of the seeded stories use it).
  await prisma.topic.deleteMany({ where: { slug: "politics" } });

  for (const topic of TOPICS) {
    await prisma.topic.upsert({
      where: { slug: topic.slug },
      create: topic,
      update: { name: topic.name },
    });
  }
  console.log(`✓ Topics: ${TOPICS.length} (politics removed if present)`);

  /* ─────────────────────────── Writers ─────────────────────────── */

  const writerIdByHandle = new Map<string, string>();
  for (const w of SEED_WRITERS) {
    const avatar = `/seed/authors/${w.handle}.webp`;
    const user = await prisma.user.upsert({
      where: { email: w.email },
      create: {
        whopUserId: `seed_user_${w.handle}`,
        email: w.email,
        username: w.handle,
        name: w.name,
        headline: w.headline,
        bio: w.bio,
        avatar,
      },
      update: {
        username: w.handle,
        name: w.name,
        headline: w.headline,
        bio: w.bio,
        avatar,
      },
    });
    await prisma.writerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        whopCompanyId: `seed_biz_${w.handle}`,
        kycComplete: true,
        tippingEnabled: true,
      },
      update: { kycComplete: true, tippingEnabled: true },
    });
    writerIdByHandle.set(w.handle, user.id);
  }
  console.log(`✓ Writers: ${SEED_WRITERS.length}`);

  /* ─────────────────────────── Readers ─────────────────────────── */

  const readerIds: string[] = [];
  for (const r of SEED_READERS) {
    const user = await prisma.user.upsert({
      where: { email: r.email },
      create: {
        whopUserId: `seed_user_${r.handle}`,
        email: r.email,
        username: r.handle,
        name: r.name,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=242424&color=fff&size=256`,
      },
      update: { username: r.handle, name: r.name },
    });
    readerIds.push(user.id);
  }
  console.log(`✓ Readers: ${SEED_READERS.length}`);

  /* ─────────────────────────── Stories ─────────────────────────── */

  // Map topic slug → id (one lookup, reused per story)
  const topicRows = await prisma.topic.findMany({ select: { id: true, slug: true } });
  const topicIdBySlug = new Map(topicRows.map((t) => [t.slug, t.id]));

  for (const rename of LEGACY_STORY_SLUG_RENAMES) {
    const authorId = writerIdByHandle.get(rename.authorHandle);
    if (!authorId) continue;

    const [legacyStory, renamedStory] = await Promise.all([
      prisma.story.findUnique({
        where: { authorUserId_slug: { authorUserId: authorId, slug: rename.from } },
        select: { id: true },
      }),
      prisma.story.findUnique({
        where: { authorUserId_slug: { authorUserId: authorId, slug: rename.to } },
        select: { id: true },
      }),
    ]);

    if (legacyStory && !renamedStory) {
      await prisma.story.update({
        where: { id: legacyStory.id },
        data: {
          slug: rename.to,
          coverImageUrl: `/seed/${rename.to}.webp`,
        },
      });
    }
  }

  const storyIds: string[] = [];
  for (let i = 0; i < SEED_STORIES.length; i++) {
    const s = SEED_STORIES[i];
    const authorId = writerIdByHandle.get(s.authorHandle);
    if (!authorId) throw new Error(`Unknown author handle: ${s.authorHandle}`);

    const publishedAt = new Date(Date.now() - s.publishedDaysAgo * 86_400_000);
    const contentJson = s.body as unknown as Prisma.InputJsonValue;
    const story = await prisma.story.upsert({
      where: { authorUserId_slug: { authorUserId: authorId, slug: s.slug } },
      create: {
        authorUserId: authorId,
        slug: s.slug,
        title: s.title,
        subtitle: s.subtitle,
        contentJson,
        excerpt: excerpt(s.body),
        coverImageUrl: s.hasCover ? `/seed/${s.slug}.webp` : null,
        status: "PUBLISHED",
        visibility: s.visibility,
        paywallNodePos: paywallPos(s.body),
        readingTimeMinutes: readingMinutes(s.body),
        likesTotal: STORY_LIKE_TOTALS[i] ?? 25,
        publishedAt,
      },
      update: {
        title: s.title,
        subtitle: s.subtitle,
        contentJson,
        excerpt: excerpt(s.body),
        coverImageUrl: s.hasCover ? `/seed/${s.slug}.webp` : null,
        status: "PUBLISHED",
        visibility: s.visibility,
        paywallNodePos: paywallPos(s.body),
        readingTimeMinutes: readingMinutes(s.body),
        likesTotal: STORY_LIKE_TOTALS[i] ?? 25,
        publishedAt,
      },
    });
    storyIds.push(story.id);

    // Reset & re-attach topics (composite-key model, deleteMany is the
    // idempotent way to rewrite the relation set).
    await prisma.storyTopic.deleteMany({ where: { storyId: story.id } });
    await prisma.storyTopic.createMany({
      data: s.topics
        .map((slug) => topicIdBySlug.get(slug))
        .filter((id): id is string => Boolean(id))
        .map((topicId) => ({ storyId: story.id, topicId })),
    });
  }
  console.log(`✓ Stories: ${SEED_STORIES.length}`);

  /* ─────────────────────────── Engagement wipe ─────────────────────────── */

  // Identify every seed user (writers + readers) by their stable whopUserId
  // prefix so we can wipe + recreate their engagement without touching the
  // root operator's real data.
  const seedUsers = await prisma.user.findMany({
    where: { whopUserId: { startsWith: "seed_user_" } },
    select: { id: true },
  });
  const seedUserIds = seedUsers.map((u) => u.id);

  await prisma.like.deleteMany({ where: { userId: { in: seedUserIds } } });
  await prisma.storyRead.deleteMany({ where: { userId: { in: seedUserIds } } });
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { followerUserId: { in: seedUserIds } },
        { followedUserId: { in: seedUserIds } },
      ],
    },
  });

  /* ─────────────────────────── Likes (real rows) ─────────────────────────── */
  // For each story, back the like counter with up to N real reader Like rows.
  // The displayed counter (likesTotal) is the inflated number from STORY_LIKE_TOTALS;
  // these backing rows just make sure /api/likes returns something realistic.

  const rng = mulberry32(0x57017b1 & 0xffffffff); // stable seed across runs
  for (let i = 0; i < storyIds.length; i++) {
    const storyId = storyIds[i];
    const inflated = STORY_LIKE_TOTALS[i] ?? 25;
    const backCount = Math.min(readerIds.length, Math.max(3, Math.floor(inflated / 30)));
    const likers = sampleN(readerIds, backCount, rng);
    if (likers.length > 0) {
      await prisma.like.createMany({
        data: likers.map((userId) => ({ userId, storyId })),
        skipDuplicates: true,
      });
    }
  }
  console.log(`✓ Likes: backed each story with 3–${readerIds.length} real rows`);

  /* ─────────────────────────── StoryReads (real rows) ─────────────────────────── */

  let totalReads = 0;
  for (let i = 0; i < storyIds.length; i++) {
    const storyId = storyIds[i];
    const targetReads = STORY_READ_COUNTS[i] ?? 12;
    // Spread reads across the last 60 days. Each reader can read a given
    // story once per month (schema constraint), so heavier reads spread
    // across 2 monthly buckets.
    const readers = sampleN(readerIds, Math.min(readerIds.length, targetReads), rng);
    for (const userId of readers) {
      const daysAgo = Math.floor(rng() * 60) + 1;
      const readAt = dateDaysAgo(daysAgo, rng);
      try {
        await prisma.storyRead.create({
          data: {
            userId,
            storyId,
            readAt,
            monthBucket: monthBucketOf(readAt),
            dwellSeconds: 60 + Math.floor(rng() * 240),
          },
        });
        totalReads++;
      } catch {
        // Composite unique violation (same user, story, month) — skip.
      }
    }
    // For stories with high target read counts, add a second pass in the
    // previous month so we cross monthly buckets.
    if (targetReads > readerIds.length) {
      const overflow = sampleN(readerIds, targetReads - readerIds.length, rng);
      for (const userId of overflow) {
        const daysAgo = 30 + Math.floor(rng() * 30);
        const readAt = dateDaysAgo(daysAgo, rng);
        try {
          await prisma.storyRead.create({
            data: {
              userId,
              storyId,
              readAt,
              monthBucket: monthBucketOf(readAt),
              dwellSeconds: 60 + Math.floor(rng() * 240),
            },
          });
          totalReads++;
        } catch {
          // skip
        }
      }
    }
  }
  console.log(`✓ StoryReads: ${totalReads} rows across last 60 days`);

  /* ─────────────────────────── Cross-writer follows ─────────────────────────── */

  let followCount = 0;
  for (const [followerHandle, followedHandles] of Object.entries(WRITER_FOLLOWS)) {
    const followerUserId = writerIdByHandle.get(followerHandle);
    if (!followerUserId) continue;
    for (const followedHandle of followedHandles) {
      const followedUserId = writerIdByHandle.get(followedHandle);
      if (!followedUserId || followedUserId === followerUserId) continue;
      await prisma.follow.create({
        data: { followerUserId, followedUserId },
      });
      followCount++;
    }
  }

  // Have a few seed writers follow the real root operator so their profile
  // doesn't look like a ghost town. No-op if the operator hasn't signed in yet.
  const rootEmail = (process.env.ROOT_OPERATOR_EMAIL || "").toLowerCase();
  if (rootEmail) {
    const operator = await prisma.user.findUnique({ where: { email: rootEmail } });
    if (operator) {
      for (const handle of FOLLOW_ROOT_OPERATOR_FROM) {
        const followerUserId = writerIdByHandle.get(handle);
        if (!followerUserId) continue;
        await prisma.follow.create({
          data: { followerUserId, followedUserId: operator.id },
        });
        followCount++;
      }
    }
  }
  console.log(`✓ Follows: ${followCount} edges`);

  console.log("\nSeed complete.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
