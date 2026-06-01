import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Star } from "lucide-react";
import { getAuthUser } from "@/lib/auth";
import { parseHandle } from "@/lib/handle";
import { prisma } from "@/lib/prisma";
import { StoryContent } from "@/lib/tiptap/render-server";
import { PaywallCard } from "@/components/PaywallCard";
import { LikeButton } from "@/components/LikeButton";
import { BookmarkButton } from "@/components/BookmarkButton";
import { FollowButton } from "@/components/FollowButton";
import { TipButton } from "@/components/checkout/TipButton";
import { ShareButton } from "@/components/ShareButton";
import { TrackRead } from "@/components/TrackRead";

interface PageProps {
  params: Promise<{ handle: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle, slug } = await params;
  const username = parseHandle(handle);
  if (!username) return {};
  const author = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!author) return {};
  const story = await prisma.story.findUnique({
    where: { authorUserId_slug: { authorUserId: author.id, slug } },
    select: { title: true, subtitle: true, excerpt: true, coverImageUrl: true },
  });
  if (!story) return {};
  return {
    title: story.title,
    description: story.subtitle ?? story.excerpt,
    openGraph: {
      title: story.title,
      description: story.subtitle ?? story.excerpt,
      images: story.coverImageUrl ? [story.coverImageUrl] : undefined,
      type: "article",
    },
  };
}

function formatLongDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function StoryReadingPage({ params }: PageProps) {
  const { handle, slug } = await params;
  const username = parseHandle(handle);
  if (!username) notFound();

  const author = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!author) notFound();

  const [story, viewer] = await Promise.all([
    prisma.story.findUnique({
      where: { authorUserId_slug: { authorUserId: author.id, slug } },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            headline: true,
            writerProfile: { select: { tippingEnabled: true, kycComplete: true } },
          },
        },
        topics: { include: { topic: true } },
      },
    }),
    getAuthUser({ include: { plusMembership: true } }),
  ]);

  if (!story || story.status !== "PUBLISHED") notFound();

  const [viewerLike, viewerBookmark, viewerFollow] = viewer
    ? await Promise.all([
        prisma.like.findUnique({
          where: { userId_storyId: { userId: viewer.id, storyId: story.id } },
          select: { id: true },
        }),
        prisma.bookmark.findUnique({
          where: { userId_storyId: { userId: viewer.id, storyId: story.id } },
          select: { id: true },
        }),
        prisma.follow.findUnique({
          where: {
            followerUserId_followedUserId: {
              followerUserId: viewer.id,
              followedUserId: story.author.id,
            },
          },
          select: { id: true },
        }),
      ])
    : [null, null, null];

  // Plus gate: server-side truncate to nodes before paywallNodePos when the reader
  // doesn't have an active membership. Truncation happens at the data layer, not via
  // CSS, so view-source can't reveal hidden content.
  const hasActivePlus =
    viewer?.plusMembership?.status === "ACTIVE" &&
    viewer.plusMembership.currentPeriodEnd > new Date();
  const isAuthor = viewer?.id === story.author.id;
  const locked = story.visibility === "PLUS" && !hasActivePlus && !isAuthor;

  return (
    <article className="mx-auto max-w-[680px] px-4 sm:px-0 py-8 sm:py-14">
      {!locked && story.visibility === "PLUS" && <TrackRead storyId={story.id} />}
      {story.visibility === "PLUS" && (
        <p className="mb-6 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-plus/15 border border-plus/30 text-[12px]">
          <Star aria-hidden="true" className="size-3.5 fill-plus stroke-plus" />
          <span className="font-medium">Paid story</span>
        </p>
      )}

      <h1 className="font-sans font-bold text-[32px] sm:text-[42px] leading-[1.24] tracking-[-0.011em] text-text-primary">
        {story.title}
      </h1>
      {story.subtitle && (
        <p className="mt-2 sm:mt-3 text-[18px] sm:text-[22px] leading-snug text-text-secondary font-normal">
          {story.subtitle}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        {story.author.avatar && (
          <Image
            src={story.author.avatar}
            alt=""
            width={44}
            height={44}
            className="size-11 rounded-full object-cover"
          />
        )}
        <div className="flex-1 min-w-0 text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/@${story.author.username}`}
              className="font-medium text-text-primary hover:underline"
            >
              {story.author.name ?? `@${story.author.username}`}
            </Link>
            {viewer?.id !== story.author.id && (
              <FollowButton
                username={story.author.username}
                initialFollowing={Boolean(viewerFollow)}
                authenticated={Boolean(viewer)}
                size="sm"
              />
            )}
          </div>
          <div className="text-text-secondary text-[13px] mt-0.5">
            {story.readingTimeMinutes} min read · {formatLongDate(story.publishedAt)}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-5 py-3 border-y border-border">
        <LikeButton
          storyId={story.id}
          initialLiked={Boolean(viewerLike)}
          initialCount={story.likesTotal}
          authenticated={Boolean(viewer)}
        />
        <BookmarkButton
          storyId={story.id}
          initialBookmarked={Boolean(viewerBookmark)}
          authenticated={Boolean(viewer)}
        />
        <div className="ml-auto flex items-center gap-3">
          <ShareButton title={story.title} />
          {viewer?.id !== story.author.id && (
            <TipButton
              storyId={story.id}
              writerName={story.author.name ?? `@${story.author.username}`}
              authenticated={Boolean(viewer)}
              tippingEnabled={Boolean(
                story.author.writerProfile?.tippingEnabled &&
                  story.author.writerProfile?.kycComplete,
              )}
            />
          )}
        </div>
      </div>

      {story.coverImageUrl && (
        // LCP image — `priority` adds fetchpriority="high" and disables lazy loading.
        <Image
          src={story.coverImageUrl}
          alt=""
          width={1280}
          height={720}
          priority
          sizes="(max-width: 680px) 100vw, 680px"
          className="mt-8 w-full h-auto max-h-[520px] object-cover rounded-sm"
        />
      )}

      <div className="story-content mt-8 font-serif text-[18px] sm:text-[20px] leading-[1.6] text-text-primary [&_p+p]:mt-6 [&_h2]:mt-12 [&_h2]:mb-2 [&_h2]:font-sans [&_h2]:text-[24px] [&_h2]:font-semibold [&_h2]:leading-snug [&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:font-sans [&_h3]:text-[20px] [&_h3]:font-semibold [&_blockquote]:my-6 [&_blockquote]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-text-primary [&_blockquote]:italic [&_blockquote]:text-[22px] [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4 [&_li+li]:mt-1.5 [&_a]:underline [&_a:hover]:text-text-secondary [&_pre]:bg-surface [&_pre]:rounded-md [&_pre]:p-4 [&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-[15px] [&_code]:font-mono [&_img]:rounded-sm [&_img]:my-8 [&_img]:w-full [&_hr]:my-10 [&_hr]:border-border [&_.paywall-break]:hidden">
        <StoryContent json={story.contentJson} options={{ truncateAtPaywall: locked }} />
      </div>

      {locked && (
        <PaywallCard
          authenticated={Boolean(viewer)}
          writerName={story.author.name ?? `@${story.author.username}`}
          returnTo={`/@${story.author.username}/${slug}`}
        />
      )}

      {!locked && story.topics.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2">
          {story.topics.map((t) => (
            <Link
              key={t.topic.slug}
              href={`/tag/${t.topic.slug}`}
              className="px-3 py-1.5 rounded-pill bg-surface text-sm text-text-secondary hover:text-text-primary"
            >
              {t.topic.name}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
