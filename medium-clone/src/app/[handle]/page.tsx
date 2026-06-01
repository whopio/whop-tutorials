import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { parseHandle } from "@/lib/handle";
import { StoryCard } from "@/components/StoryCard";
import { FollowButton } from "@/components/FollowButton";
import { ProfileInlineEditor } from "./ProfileInlineEditor";

interface PageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const username = parseHandle(handle);
  if (!username) return {};
  const user = await prisma.user.findUnique({
    where: { username },
    select: { name: true, headline: true },
  });
  if (!user) return {};
  return {
    title: `${user.name ?? username}`,
    description: user.headline ?? `Stories by @${username}`,
  };
}

export default async function WriterProfilePage({ params }: PageProps) {
  const { handle } = await params;
  const username = parseHandle(handle);
  if (!username) notFound();

  const [user, viewer] = await Promise.all([
    prisma.user.findUnique({
      where: { username },
      include: {
        stories: {
          where: { status: "PUBLISHED" },
          orderBy: { publishedAt: "desc" },
          include: {
            author: { select: { username: true, name: true } },
            topics: { include: { topic: true } },
          },
        },
        _count: { select: { followers: true, following: true } },
      },
    }),
    getAuthUser(),
  ]);

  if (!user) notFound();

  const isFollowing = viewer
    ? Boolean(
        await prisma.follow.findUnique({
          where: {
            followerUserId_followedUserId: {
              followerUserId: viewer.id,
              followedUserId: user.id,
            },
          },
          select: { id: true },
        }),
      )
    : false;

  const isSelf = viewer?.id === user.id;

  return (
    <div className="mx-auto max-w-[680px] px-4 sm:px-6 py-8 sm:py-12">
      <header className="pb-6 border-b border-border">
        <div className="flex items-start gap-4">
          {user.avatar && (
            <Image
              src={user.avatar}
              alt=""
              width={64}
              height={64}
              className="size-16 rounded-full object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="font-sans font-bold text-[28px] text-text-primary">
                  {user.name ?? `@${user.username}`}
                </h1>
                <p className="text-text-secondary mt-0.5">@{user.username}</p>
              </div>
              {!isSelf && (
                <FollowButton
                  username={user.username}
                  initialFollowing={isFollowing}
                  authenticated={Boolean(viewer)}
                />
              )}
            </div>
            {isSelf ? (
              <ProfileInlineEditor
                initialHeadline={user.headline}
                initialBio={user.bio}
              />
            ) : (
              <>
                {user.headline && (
                  <p className="text-text-secondary mt-2">{user.headline}</p>
                )}
                {user.bio && (
                  <p className="text-text-primary mt-3 text-[15px] leading-relaxed">
                    {user.bio}
                  </p>
                )}
              </>
            )}
            <p className="text-sm text-text-tertiary mt-3">
              {user._count.followers} {user._count.followers === 1 ? "follower" : "followers"} ·{" "}
              {user._count.following} following
            </p>
          </div>
        </div>
      </header>

      <section className="pt-2">
        {user.stories.length === 0 ? (
          <div className="py-16 text-center text-text-secondary">No stories yet.</div>
        ) : (
          user.stories.map((story) => (
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
                author: { username: story.author.username, name: story.author.name },
                topics: story.topics.map((t) => ({ slug: t.topic.slug, name: t.topic.name })),
              }}
            />
          ))
        )}
      </section>
    </div>
  );
}
