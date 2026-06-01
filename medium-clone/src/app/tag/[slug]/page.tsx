import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { StoryCard } from "@/components/StoryCard";
import { TopicFollowButton } from "@/components/TopicFollowButton";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = await prisma.topic.findUnique({ where: { slug }, select: { name: true } });
  if (!topic) return {};
  return { title: topic.name };
}

export default async function TagPage({ params }: PageProps) {
  const { slug } = await params;
  const user = await getAuthUser();

  const [topic, follow] = await Promise.all([
    prisma.topic.findUnique({
      where: { slug },
      include: {
        stories: {
          where: { story: { status: "PUBLISHED" } },
          orderBy: { story: { publishedAt: "desc" } },
          include: {
            story: {
              include: {
                author: { select: { username: true, name: true } },
                topics: { include: { topic: true } },
              },
            },
          },
        },
      },
    }),
    user
      ? prisma.topicFollow.findFirst({
          where: { userId: user.id, topic: { slug } },
          select: { userId: true },
        })
      : Promise.resolve(null),
  ]);

  if (!topic) notFound();

  return (
    <div className="mx-auto max-w-[680px] px-4 sm:px-6 py-8 sm:py-12">
      <header className="pb-6 border-b border-border">
        <p className="text-sm uppercase tracking-widest text-text-tertiary">Topic</p>
        <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-display font-normal text-[36px] sm:text-[48px] text-text-primary leading-tight">
            {topic.name}
          </h1>
          <TopicFollowButton
            topicSlug={topic.slug}
            initialFollowing={Boolean(follow)}
            authenticated={Boolean(user)}
          />
        </div>
        {topic.description && (
          <p className="mt-2 text-text-secondary">{topic.description}</p>
        )}
      </header>

      <section>
        {topic.stories.length === 0 ? (
          <div className="py-16 text-center text-text-secondary">
            No stories tagged {topic.name} yet.
          </div>
        ) : (
          topic.stories.map(({ story }) => (
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
