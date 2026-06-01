import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import type { JSONContent } from "@tiptap/core";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StoryCard, type StoryCardData } from "@/components/StoryCard";
import { FollowButton } from "@/components/FollowButton";

const AUTH_ERROR_LABELS: Record<string, string> = {
  state_mismatch: "Sign-in didn't complete (state mismatch). Try again.",
  token_exchange_failed: "Whop couldn't issue an access token. Try again.",
  userinfo_failed: "Signed in, but couldn't load your profile from Whop. Try again.",
};

interface HomeProps {
  searchParams: Promise<{ auth_error?: string }>;
}

type TrendingStoryData = StoryCardData & {
  freePreview: string;
};

export default async function Home({ searchParams }: HomeProps) {
  const { auth_error } = await searchParams;
  const authErrorMessage = auth_error ? AUTH_ERROR_LABELS[auth_error] ?? "Sign-in failed." : null;

  const user = await getAuthUser({
    include: {
      following: { select: { followedUserId: true } },
      topicFollows: { select: { topicId: true } },
      plusMembership: { select: { status: true } },
    },
  });

  if (!user) return <SignedOutHome authErrorMessage={authErrorMessage} />;
  return <SignedInHome user={user} />;
}

function AuthErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mx-auto max-w-[760px] mt-4 mx-4 sm:mx-auto px-4 py-3 rounded-md bg-error/10 text-error text-sm border border-error/30 flex items-center justify-between gap-3"
    >
      <span>{message}</span>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- route handler */}
      <a href="/api/auth/login" className="font-medium underline shrink-0">
        Try again
      </a>
    </div>
  );
}

// ─── Signed-out: marketing hero + trending stories grid ───────────────────────

async function SignedOutHome({ authErrorMessage }: { authErrorMessage: string | null }) {
  const trending = await prisma.story.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ likesTotal: "desc" }, { publishedAt: "desc" }],
    take: 8,
    include: {
      author: { select: { username: true, name: true } },
      topics: { include: { topic: true } },
    },
  });

  const trendingStories: TrendingStoryData[] = trending.map((story) => ({
    id: story.id,
    slug: story.slug,
    title: story.title,
    subtitle: story.subtitle,
    excerpt: story.excerpt,
    freePreview: buildFreePreview(story.contentJson as JSONContent | null),
    coverImageUrl: story.coverImageUrl,
    readingTimeMinutes: story.readingTimeMinutes,
    likesTotal: story.likesTotal,
    visibility: story.visibility,
    publishedAt: story.publishedAt,
    author: { username: story.author.username, name: story.author.name },
    topics: story.topics.map((t) => ({ slug: t.topic.slug, name: t.topic.name })),
  }));

  return (
    <>
      {authErrorMessage && <AuthErrorBanner message={authErrorMessage} />}
      <section className="bg-background-marketing border-b border-border">
        <div className="mx-auto max-w-[1336px] px-6 sm:px-10 py-16 sm:py-24 lg:py-28 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center">
          <div className="max-w-2xl">
            <h1 className="font-display font-normal leading-[1.05] tracking-tight text-text-primary text-[48px] sm:text-[72px] lg:text-[85px]">
              Writing that pays.
            </h1>
            <p className="mt-5 sm:mt-7 text-text-primary text-lg sm:text-xl max-w-xl">
              Reader-funded long-form. $5/month unlocks every paid story, and 70% of revenue goes
              to the writers you actually read.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/membership"
                className="inline-flex items-center px-6 py-3 rounded-pill text-base font-medium bg-brand text-white hover:bg-brand-hover"
              >
                Subscribe — $5/month
              </Link>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /api/auth/login is a route handler returning a 307 redirect, not a page */}
              <a
                href="/api/auth/login?returnTo=/new-story"
                className="inline-flex items-center px-6 py-3 rounded-pill text-base font-medium border border-text-primary text-text-primary hover:bg-text-primary hover:text-background transition-colors"
              >
                Start writing
              </a>
            </div>
            <p className="mt-4 text-sm text-text-secondary">
              Free to read what writers publish for free. No ads, no algorithm, no claps.
            </p>
          </div>

          <div className="hidden lg:block w-[420px]" aria-hidden="true">
            {/* Pre-rendered fan of three seed story cards. Static WebP — generated
                once via scripts/hero-stack.html + scripts/convert-hero.mjs. */}
            <Image
              src="/hero-stack.webp"
              alt=""
              width={1070}
              height={909}
              priority
              sizes="420px"
              className="w-full h-auto select-none"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h2 className="font-sans font-bold text-[24px] sm:text-[28px] text-text-primary mb-2">
          What readers picked this week
        </h2>
        <p className="text-text-secondary mb-6">
          Ranked by likes, not engagement metrics or watch time.
        </p>
        <TrendingBento stories={trendingStories} />
      </section>
    </>
  );
}

// ─── Signed-in: two-column home (main feed + sticky sidebar) ─────────────────
//
// Feed strategy: the main feed is *always* the latest stories across the whole
// platform — following someone doesn't filter the feed. Followed content gets
// surfaced separately in a "From writers you follow" rail above the main feed
// so the signal isn't lost. This mirrors Medium's "For you" pattern: a mix,
// not a strict filter.

function formatStoryDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function textFromNode(node: JSONContent): string {
  if (typeof node.text === "string") return node.text;
  if (!Array.isArray(node.content)) return "";
  return node.content.map(textFromNode).filter(Boolean).join(" ");
}

function truncatePreview(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxChars * 0.65 ? cut.slice(0, lastSpace) : cut).trimEnd()}...`;
}

function buildFreePreview(doc: JSONContent | null, maxChars = 520): string {
  if (!doc || !Array.isArray(doc.content)) return "";

  const parts: string[] = [];
  for (const block of doc.content) {
    if (block.type === "paywallBreak") break;
    const text = textFromNode(block).replace(/\s+/g, " ").trim();
    if (text) parts.push(text);
  }

  return truncatePreview(parts.join(" ").replace(/\s+/g, " ").trim(), maxChars);
}

function TrendingBento({ stories }: { stories: TrendingStoryData[] }) {
  if (stories.length === 0) {
    return (
      <div className="py-12 text-center text-text-secondary border-t border-border">
        Nothing published yet. Yours could be the first.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4">
      {stories.map((story, index) => (
        <TrendingBentoCard key={story.id} story={story} index={index} />
      ))}
    </div>
  );
}

function TrendingBentoCard({ story, index }: { story: TrendingStoryData; index: number }) {
  const href = `/@${story.author.username}/${story.slug}`;
  const isLead = index === 0;
  const isWide = index === 1 || index === 2;
  const topic = story.topics[0]?.name;
  const summary = story.subtitle || story.excerpt;
  const cardClass = [
    "group flex h-full min-h-[260px] flex-col overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-text-primary",
    isLead
      ? "md:col-span-2 lg:col-span-7 lg:row-span-2"
      : isWide
        ? "lg:col-span-5"
        : "lg:col-span-3",
  ].join(" ");
  const imageClass = [
    "w-full object-cover bg-surface transition-transform duration-200 group-hover:scale-[1.02]",
    isLead ? "h-56 sm:h-72 lg:h-[320px]" : isWide ? "h-44" : "h-36",
  ].join(" ");

  return (
    <Link href={href} className={cardClass}>
      {story.coverImageUrl ? (
        <Image
          src={story.coverImageUrl}
          alt=""
          width={isLead ? 1280 : 800}
          height={isLead ? 720 : 450}
          sizes={
            isLead
              ? "(max-width: 1024px) 100vw, 50vw"
              : "(max-width: 1024px) 100vw, 33vw"
          }
          className={imageClass}
        />
      ) : (
        <div className={imageClass} aria-hidden="true" />
      )}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 text-[12px] text-text-tertiary">
          <span className="min-w-0 truncate">{topic ? `in ${topic}` : "Storyline"}</span>
          <span className="shrink-0 tabular-nums">
            {story.likesTotal} {story.likesTotal === 1 ? "like" : "likes"}
          </span>
        </div>
        <h3
          className={[
            "mt-3 font-sans font-bold leading-tight text-text-primary group-hover:underline",
            isLead ? "text-[24px] sm:text-[30px]" : "text-[18px] sm:text-[20px]",
          ].join(" ")}
        >
          {story.title}
        </h3>
        {summary && (
          <p
            className={[
              "mt-2 text-text-secondary leading-relaxed",
              isLead ? "text-[15px] sm:text-base" : "text-sm line-clamp-2",
            ].join(" ")}
          >
            {summary}
          </p>
        )}
        {isLead && story.freePreview && (
          <div className="mt-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-tertiary">
              Free preview
            </p>
            <p className="mt-2 text-[15px] leading-7 text-text-secondary line-clamp-7">
              {story.freePreview}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-text-primary">
              Start reading
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        )}
        <div className="mt-auto pt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-text-tertiary">
          <span className="text-text-secondary">
            {story.author.name || `@${story.author.username}`}
          </span>
          <span aria-hidden="true">-</span>
          <span>{formatStoryDate(story.publishedAt)}</span>
          <span aria-hidden="true">-</span>
          <span>{story.readingTimeMinutes} min read</span>
          {story.visibility === "PLUS" && (
            <>
              <span aria-hidden="true">-</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-pill bg-plus/15 text-[12px]">
                <Star aria-hidden="true" className="size-3 fill-plus stroke-plus" />
                <span className="text-text-primary font-medium">Plus</span>
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

interface SignedInHomeUser {
  id: string;
  following: { followedUserId: string }[];
  topicFollows: { topicId: string }[];
  plusMembership: { status: "ACTIVE" | "PAUSED" | "CANCELED" | "EXPIRED" } | null;
}

async function SignedInHome({ user }: { user: SignedInHomeUser }) {
  const followedAuthorIds = user.following.map((f) => f.followedUserId);
  const followedTopicIds = user.topicFollows.map((t) => t.topicId);
  const hasPlus = user.plusMembership?.status === "ACTIVE";

  // Main feed: latest across the whole platform. Never filtered.
  const latestPromise = prisma.story.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 20,
    include: {
      author: { select: { username: true, name: true } },
      topics: { include: { topic: true } },
    },
  });

  // Followed-author rail (only if the user follows someone).
  const followedRailPromise =
    followedAuthorIds.length > 0
      ? prisma.story.findMany({
          where: { status: "PUBLISHED", authorUserId: { in: followedAuthorIds } },
          orderBy: { publishedAt: "desc" },
          take: 3,
          include: {
            author: { select: { username: true, name: true } },
            topics: { include: { topic: true } },
          },
        })
      : Promise.resolve([]);

  // Sidebar: every topic with the user's follow state baked in.
  const topicsPromise = prisma.topic.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { stories: true } } },
  });

  // Sidebar: 4 writers the user isn't already following, sorted by followers.
  const whoToFollowPromise = prisma.user.findMany({
    where: {
      writerProfile: { isNot: null },
      stories: { some: { status: "PUBLISHED" } },
      id: { notIn: [user.id, ...followedAuthorIds] },
    },
    orderBy: { followers: { _count: "desc" } },
    take: 4,
    select: {
      id: true,
      username: true,
      name: true,
      avatar: true,
      headline: true,
      _count: { select: { followers: true } },
    },
  });

  const [latest, followedRail, topics, whoToFollow] = await Promise.all([
    latestPromise,
    followedRailPromise,
    topicsPromise,
    whoToFollowPromise,
  ]);

  const followedTopicIdSet = new Set(followedTopicIds);

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-10 lg:gap-12">
        {/* ─────────────────────────── Main column ─────────────────────────── */}
        <main className="min-w-0">
          {followedRail.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="font-sans font-bold text-[18px] text-text-primary">
                  From writers you follow
                </h2>
                <span className="text-xs text-text-tertiary">
                  {user.following.length}{" "}
                  {user.following.length === 1 ? "writer" : "writers"}
                </span>
              </div>
              <div className="border-t border-border">
                {followedRail.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={{
                      id: story.id,
                      slug: story.slug,
                      title: story.title,
                      subtitle: story.subtitle,
                      excerpt: story.excerpt,
                      coverImageUrl: story.coverImageUrl,
                      readingTimeMinutes: story.readingTimeMinutes,
                      likesTotal: story.likesTotal,
                      visibility: story.visibility,
                      publishedAt: story.publishedAt,
                      author: {
                        username: story.author.username,
                        name: story.author.name,
                      },
                      topics: story.topics.map((t) => ({
                        slug: t.topic.slug,
                        name: t.topic.name,
                      })),
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-sans font-bold text-[18px] text-text-primary">
                Latest
              </h2>
              {followedRail.length === 0 && followedAuthorIds.length === 0 &&
                followedTopicIds.length === 0 && (
                  <Link
                    href="/topics"
                    className="text-xs text-text-secondary hover:text-text-primary"
                  >
                    Pick topics →
                  </Link>
                )}
            </div>
            <div className="border-t border-border">
              {latest.length === 0 ? (
                <div className="py-12 text-center text-text-secondary">
                  Nothing here yet. Write the first one.
                </div>
              ) : (
                latest.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={{
                      id: story.id,
                      slug: story.slug,
                      title: story.title,
                      subtitle: story.subtitle,
                      excerpt: story.excerpt,
                      coverImageUrl: story.coverImageUrl,
                      readingTimeMinutes: story.readingTimeMinutes,
                      likesTotal: story.likesTotal,
                      visibility: story.visibility,
                      publishedAt: story.publishedAt,
                      author: {
                        username: story.author.username,
                        name: story.author.name,
                      },
                      topics: story.topics.map((t) => ({
                        slug: t.topic.slug,
                        name: t.topic.name,
                      })),
                    }}
                  />
                ))
              )}
            </div>
          </section>
        </main>

        {/* ─────────────────────────── Sidebar ─────────────────────────── */}
        <aside className="lg:sticky lg:top-[73px] lg:self-start space-y-8 lg:max-h-[calc(100vh-89px)] lg:overflow-y-auto lg:pr-1">
          {!hasPlus && <PlusUpsellPanel />}
          <WhoToFollowPanel writers={whoToFollow} authenticated />
          <TopicsPanel
            topics={topics}
            followedTopicIds={followedTopicIdSet}
            authenticated
          />
        </aside>
      </div>
    </div>
  );
}

/* ───────────────────────────── Sidebar panels ───────────────────────────── */

function PlusUpsellPanel() {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center gap-2 text-text-primary font-sans font-semibold text-[15px]">
        <Sparkles aria-hidden="true" className="size-4 text-plus" />
        <span>Storyline Plus</span>
      </div>
      <p className="mt-2 text-sm text-text-secondary leading-relaxed">
        $5 a month unlocks every paid story. 70% of your subscription goes to
        the writers you actually read.
      </p>
      <Link
        href="/membership"
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-brand text-white text-sm font-medium hover:bg-brand-hover"
      >
        Subscribe — $5/month
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </section>
  );
}

interface WhoToFollowWriter {
  id: string;
  username: string;
  name: string | null;
  avatar: string | null;
  headline: string | null;
  _count: { followers: number };
}

function WhoToFollowPanel({
  writers,
  authenticated,
}: {
  writers: WhoToFollowWriter[];
  authenticated: boolean;
}) {
  if (writers.length === 0) return null;
  return (
    <section>
      <h2 className="font-sans font-semibold text-[15px] text-text-primary mb-3">
        Who to follow
      </h2>
      <ul className="space-y-4">
        {writers.map((w) => {
          const initial = (w.name || w.username).slice(0, 1).toUpperCase();
          return (
            <li key={w.id} className="flex items-start gap-3">
              {w.avatar ? (
                <Image
                  src={w.avatar}
                  alt=""
                  width={36}
                  height={36}
                  className="size-9 rounded-full object-cover shrink-0"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="size-9 rounded-full bg-gradient-to-br from-brand to-brand-hover text-white text-sm flex items-center justify-center shrink-0 font-display"
                >
                  {initial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/@${w.username}`}
                  className="block font-medium text-sm text-text-primary hover:underline truncate"
                >
                  {w.name ?? w.username}
                </Link>
                {w.headline && (
                  <p className="text-xs text-text-secondary line-clamp-2 mt-0.5 leading-snug">
                    {w.headline}
                  </p>
                )}
                <div className="mt-2">
                  <FollowButton
                    username={w.username}
                    initialFollowing={false}
                    authenticated={authenticated}
                    size="sm"
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TopicsPanel({
  topics,
  followedTopicIds,
}: {
  topics: { id: string; slug: string; name: string; _count: { stories: number } }[];
  followedTopicIds: Set<string>;
  authenticated: boolean;
}) {
  // Sidebar pills are nav links, not toggles — clicking goes to the topic page
  // where the user can follow. Followed topics float to the top and get filled
  // styling so the follow signal is still visible at a glance. Hides topics
  // with no stories so the sidebar isn't padded with dead chips.
  const sorted = [...topics]
    .filter((t) => t._count.stories > 0)
    .sort((a, b) => {
      const aF = followedTopicIds.has(a.id) ? 0 : 1;
      const bF = followedTopicIds.has(b.id) ? 0 : 1;
      if (aF !== bF) return aF - bF;
      return b._count.stories - a._count.stories;
    });
  return (
    <section>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="font-sans font-semibold text-[15px] text-text-primary">
          Recommended topics
        </h2>
        <Link
          href="/topics"
          className="text-xs text-text-secondary hover:text-text-primary"
        >
          See all
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {sorted.slice(0, 12).map((t) => {
          const followed = followedTopicIds.has(t.id);
          return (
            <Link
              key={t.id}
              href={`/tag/${t.slug}`}
              className={
                followed
                  ? "inline-flex items-center px-3 py-1.5 rounded-pill text-xs font-medium bg-text-primary text-background hover:bg-text-primary/85 transition-colors"
                  : "inline-flex items-center px-3 py-1.5 rounded-pill text-xs font-medium bg-surface text-text-secondary hover:bg-text-primary hover:text-background transition-colors"
              }
            >
              {t.name}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
