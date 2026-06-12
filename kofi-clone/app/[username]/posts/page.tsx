import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getViewerContext, canViewPost } from "@/lib/creator";
import CreatorProfileHeader from "@/components/creator/CreatorProfileHeader";
import BrandIcon from "@/components/BrandIcon";
import { Pin } from "@/components/Icons";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function visibilityLabel(visibility: "PUBLIC" | "SUPPORTERS" | "TIER", tierName: string | null): string {
  if (visibility === "PUBLIC") return "Public";
  if (visibility === "TIER") return tierName ?? "Members";
  return "Supporters";
}

export default async function PostsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const creator = await prisma.creator.findUnique({
    where: { username },
    select: { id: true, userId: true, isActive: true },
  });
  if (!creator || !creator.isActive) notFound();

  const [posts, viewer] = await Promise.all([
    prisma.post.findMany({
      where: { creatorId: creator.id, published: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      include: { minimumTier: { select: { id: true, name: true } } },
    }),
    getViewerContext(creator.id, creator.userId),
  ]);

  return (
    <>
      <CreatorProfileHeader username={username} />

      <div className="mx-auto max-w-5xl px-5 py-6">
        <h1 className="text-xl font-bold">Posts</h1>

        <div className="mt-5 space-y-4">
          {posts.length === 0 ? (
            <div className="kofi-card p-8 text-center">
              <p className="text-sm text-muted">No posts yet.</p>
            </div>
          ) : (
            posts.map((post) => {
              const canView = canViewPost(post, viewer);
              return (
                <div key={post.id} className="kofi-card p-5">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    {post.pinned ? (
                      <span className="inline-flex items-center gap-1 font-semibold" style={{ color: "var(--accent)" }}>
                        <Pin className="h-3.5 w-3.5" /> Pinned
                      </span>
                    ) : null}
                    <span>{formatDate(post.createdAt)}</span>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 font-medium">
                      {visibilityLabel(post.visibility, post.minimumTier?.name ?? null)}
                    </span>
                  </div>

                  {canView ? (
                    <>
                      <Link
                        href={`/${username}/post/${post.id}`}
                        className="text-lg font-bold hover:underline"
                      >
                        {post.title}
                      </Link>
                      <p className="mt-1 line-clamp-3 text-sm text-muted">{post.content}</p>
                      <Link
                        href={`/${username}/post/${post.id}`}
                        className="mt-2 inline-block text-sm font-semibold"
                        style={{ color: "var(--accent)" }}
                      >
                        Read more
                      </Link>
                    </>
                  ) : (
                    <>
                      <h2 className="text-lg font-bold">{post.title}</h2>
                      <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
                        <BrandIcon name="lock" className="mr-1 h-4 w-4 align-text-bottom" />This post is for supporters.{" "}
                        <Link href={`/${username}#support`} className="font-semibold" style={{ color: "var(--accent)" }}>
                          Unlock it
                        </Link>
                      </p>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
