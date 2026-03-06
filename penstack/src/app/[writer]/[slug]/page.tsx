import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getPostBySlug, isLikedByUser } from "@/services/post-service";
import { canAccessPaidContent } from "@/services/subscription-service";
import { PostContent } from "@/components/post/post-content";
import { LikeButton } from "@/components/post/like-button";
import { PaywallGate } from "@/components/post/paywall-gate";
import { formatDate, estimateReadingTime } from "@/lib/utils";

interface ArticlePageProps {
  params: Promise<{ writer: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { writer, slug } = await params;
  const post = await getPostBySlug(writer, slug);

  if (!post) {
    return { title: "Post not found | Penstack" };
  }

  return {
    title: `${post.title} | Penstack`,
    description: post.subtitle ?? `By ${post.writer.name}`,
    openGraph: {
      title: post.title,
      description: post.subtitle ?? `By ${post.writer.name}`,
      type: "article",
      ...(post.coverImageUrl ? { images: [post.coverImageUrl] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { writer: writerHandle, slug } = await params;
  const post = await getPostBySlug(writerHandle, slug);

  if (!post) notFound();

  const user = await requireAuth({ redirect: false });

  // Determine content access
  let hasAccess = true;
  let paywallIndex: number | undefined;

  if (post.visibility !== "FREE") {
    if (!user) {
      hasAccess = false;
    } else {
      hasAccess = await canAccessPaidContent(user.id, post.writerId);
    }

    if (
      !hasAccess &&
      post.visibility === "PREVIEW" &&
      post.paywallIndex != null
    ) {
      paywallIndex = post.paywallIndex;
    }
  }

  const liked = user ? await isLikedByUser(user.id, post.id) : false;
  const readingTime = estimateReadingTime(post.content);

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      {post.coverImageUrl && (
        <img
          src={post.coverImageUrl}
          alt={post.title}
          className="mb-8 aspect-[2/1] w-full rounded-xl object-cover"
        />
      )}

      <header className="mb-8">
        <h1 className="font-serif text-4xl font-bold leading-tight">
          {post.title}
        </h1>
        {post.subtitle && (
          <p className="mt-3 text-xl text-gray-600">{post.subtitle}</p>
        )}
        <div className="mt-4 flex items-center gap-3 text-sm text-gray-500">
          <a
            href={`/${post.writer.handle}`}
            className="flex items-center gap-2 font-medium text-gray-900 hover:underline"
          >
            {post.writer.avatarUrl && (
              <img
                src={post.writer.avatarUrl}
                alt={post.writer.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            )}
            {post.writer.name}
          </a>
          <span aria-hidden="true">&middot;</span>
          <time dateTime={post.publishedAt?.toISOString()}>
            {post.publishedAt ? formatDate(post.publishedAt) : "Draft"}
          </time>
          <span aria-hidden="true">&middot;</span>
          <span>{readingTime} min read</span>
        </div>
      </header>

      {hasAccess ? (
        <PostContent content={post.content} />
      ) : post.visibility === "PREVIEW" && paywallIndex != null ? (
        <PostContent
          content={post.content}
          paywallIndex={paywallIndex}
          writerName={post.writer.name}
          writerHandle={post.writer.handle}
          price={post.writer.monthlyPriceInCents ?? undefined}
        />
      ) : (
        <PaywallGate
          writerName={post.writer.name}
          writerHandle={post.writer.handle}
          price={post.writer.monthlyPriceInCents}
        />
      )}

      <footer className="mt-10 flex items-center justify-between border-t border-gray-200 pt-6">
        <LikeButton
          postId={post.id}
          initialLiked={liked}
          initialCount={post._count.likes}
          isLoggedIn={!!user}
        />
        <a
          href={`/${post.writer.handle}`}
          className="text-sm font-medium text-[var(--brand-600)] hover:underline"
        >
          More from {post.writer.name}
        </a>
      </footer>
    </article>
  );
}
