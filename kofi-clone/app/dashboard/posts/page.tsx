import { requireCreator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PostManager from "@/components/dashboard/PostManager";

export default async function DashboardPostsPage() {
  const { creator } = await requireCreator();

  const [posts, tiers] = await Promise.all([
    prisma.post.findMany({
      where: { creatorId: creator.id },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      include: { minimumTier: { select: { name: true } } },
    }),
    prisma.tier.findMany({
      where: { creatorId: creator.id, isActive: true },
      orderBy: [{ order: "asc" }, { priceCents: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const initialPosts = posts.map((post) => ({
    id: post.id,
    title: post.title,
    visibility: post.visibility,
    minimumTierName: post.minimumTier?.name ?? null,
    pinned: post.pinned,
    createdAt: post.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Posts</h1>
        <p className="mt-1 text-sm text-muted">
          Share updates with everyone, your supporters, or a specific tier.
        </p>
      </div>

      <PostManager posts={initialPosts} tiers={tiers} />
    </div>
  );
}
