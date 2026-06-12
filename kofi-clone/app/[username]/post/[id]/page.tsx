/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getViewerContext, canViewPost } from "@/lib/creator";
import CreatorProfileHeader from "@/components/creator/CreatorProfileHeader";
import BrandIcon from "@/components/BrandIcon";
import { ChevronLeft } from "@/components/Icons";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default async function PostPage({ params }: { params: Promise<{ username: string; id: string }> }) {
  const { username, id } = await params;

  const creator = await prisma.creator.findUnique({
    where: { username },
    select: { id: true, userId: true, displayName: true, isActive: true },
  });
  if (!creator || !creator.isActive) notFound();

  const post = await prisma.post.findUnique({
    where: { id },
    include: { minimumTier: { select: { id: true, name: true } } },
  });
  if (!post || post.creatorId !== creator.id || !post.published) notFound();

  const viewer = await getViewerContext(creator.id, creator.userId);
  const canView = canViewPost(post, viewer);

  return (
    <>
      <CreatorProfileHeader username={username} />

      <div className="mx-auto max-w-5xl px-5 py-6">
        <article className="kofi-card mx-auto max-w-2xl p-6">
          <Link href={`/${username}/posts`} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
            <ChevronLeft className="h-4 w-4" /> All posts
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{formatDate(post.createdAt)}</span>
            {post.visibility !== "PUBLIC" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 font-medium">
                <BrandIcon name="lock" className="h-3.5 w-3.5" />
                {post.minimumTier?.name ?? "Supporters"}
              </span>
            ) : null}
          </div>

          <h1 className="mt-2 text-2xl font-bold">{post.title}</h1>

          {canView ? (
            <>
              {post.imageUrl ? (
                <img src={post.imageUrl} alt="" className="mt-4 w-full rounded-xl object-cover" />
              ) : null}
              <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">{post.content}</div>
            </>
          ) : (
            <div className="mt-6 rounded-xl border border-line bg-surface-2 p-6 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-surface">
                <BrandIcon name="lock" className="h-8 w-8" />
              </div>
              <p className="text-sm font-semibold">This post is for supporters</p>
              <p className="mt-1 text-sm text-muted">
                Back {creator.displayName} to unlock this post and more.
              </p>
              <Link href={`/${username}#support`} className="btn-pill btn-accent mt-4">
                Unlock
              </Link>
            </div>
          )}
        </article>
      </div>
    </>
  );
}
