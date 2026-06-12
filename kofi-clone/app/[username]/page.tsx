/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getViewerContext, canViewPost } from "@/lib/creator";
import { isSandbox } from "@/lib/env";
import { accentHex } from "@/lib/accent";
import { formatUsd } from "@/lib/fees";
import SupportWidget from "@/components/creator/SupportWidget";
import CreatorProfileHeader from "@/components/creator/CreatorProfileHeader";
import BrandIcon from "@/components/BrandIcon";
import { Pin } from "@/components/Icons";

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default async function CreatorPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const creator = await prisma.creator.findUnique({
    where: { username },
    include: {
      tiers: { where: { isActive: true }, orderBy: { priceCents: "asc" } },
      products: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 3 },
      goals: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!creator || !creator.isActive) notFound();

  const [supports, posts, sumAgg, viewer] = await Promise.all([
    prisma.support.findMany({
      where: { creatorId: creator.id, status: "COMPLETED", isPublic: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { supporter: { select: { username: true, avatarUrl: true } } },
    }),
    prisma.post.findMany({
      where: { creatorId: creator.id, published: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 10,
      include: { minimumTier: { select: { id: true, name: true } } },
    }),
    prisma.support.aggregate({ where: { creatorId: creator.id, status: "COMPLETED" }, _sum: { amountCents: true } }),
    getViewerContext(creator.id, creator.userId),
  ]);

  const accent = accentHex(creator.accentColor);
  const goal = creator.goals[0];
  const raised = sumAgg._sum.amountCents ?? 0;
  const goalPct = goal ? Math.min(100, Math.round((raised / goal.targetCents) * 100)) : null;

  const pinned = posts.filter((p) => p.pinned);
  const feed = [
    ...posts.filter((p) => !p.pinned).map((p) => ({ kind: "post" as const, date: p.createdAt, post: p })),
    ...supports.map((s) => ({ kind: "support" as const, date: s.createdAt, support: s })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <>
      <CreatorProfileHeader username={username} />

      <div className="mx-auto max-w-5xl px-5 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="order-2 space-y-6 lg:order-1">
            {goal ? (
              <div className="kofi-card p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold">{goal.title}</h2>
                  <span className="text-sm font-semibold text-muted">{goalPct}%</span>
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-positive" style={{ width: `${goalPct}%` }} />
                </div>
                <p className="mt-2 text-sm text-muted">
                  {formatUsd(raised)} of {formatUsd(goal.targetCents)}
                </p>
                {goal.description ? <p className="mt-3 text-sm">{goal.description}</p> : null}
              </div>
            ) : null}

            {creator.bio ? (
              <div className="kofi-card p-5">
                <h2 className="mb-2 font-bold">About {creator.displayName}</h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{creator.bio}</p>
                {creator.tags.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {creator.tags.map((t) => (
                      <span key={t} className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-muted">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="kofi-card p-5">
              <h2 className="mb-4 font-bold">Recent activity</h2>
              {pinned.length === 0 && feed.length === 0 ? (
                <p className="text-sm text-muted">No activity yet. Be the first to show support!</p>
              ) : (
                <div className="space-y-4">
                  {pinned.map((post) => (
                    <PostItem key={post.id} post={post} canView={canViewPost(post, viewer)} username={username} pinned />
                  ))}
                  {feed.map((item) =>
                    item.kind === "post" ? (
                      <PostItem key={`p-${item.post.id}`} post={item.post} canView={canViewPost(item.post, viewer)} username={username} />
                    ) : (
                      <SupportItem key={`s-${item.support.id}`} support={item.support} />
                    ),
                  )}
                </div>
              )}
            </div>
          </div>

          <aside className="order-1 space-y-6 lg:order-2">
            <div id="support">
              <SupportWidget
                creatorUsername={username}
                creatorDisplayName={creator.displayName}
                accentColor={creator.accentColor}
                sandbox={isSandbox()}
                hasMemberships={creator.tiers.length > 0}
              />
            </div>

            {creator.tiers.length > 0 ? (
              <div className="kofi-card p-5">
                <h3 className="font-bold">Become a regular</h3>
                <p className="mt-1 text-sm text-muted">Monthly support from {formatUsd(creator.tiers[0].priceCents)}/mo</p>
                <Link href={`/${username}/membership`} className="btn-pill btn-outline mt-3 w-full text-sm">
                  See membership options
                </Link>
              </div>
            ) : null}

            {creator.products.length > 0 ? (
              <div className="kofi-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold">Shop</h3>
                  <Link href={`/${username}/shop`} className="text-sm font-semibold" style={{ color: accent }}>
                    Go to shop
                  </Link>
                </div>
                <div className="space-y-3">
                  {creator.products.map((p) => (
                    <Link key={p.id} href={`/${username}/shop`} className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-lg bg-surface-2">
                        {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{p.title}</p>
                        <p className="text-xs text-muted">{p.priceCents === 0 ? "Free" : formatUsd(p.priceCents)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </>
  );
}

type PostWithTier = {
  id: string;
  title: string;
  content: string;
  visibility: "PUBLIC" | "SUPPORTERS" | "TIER";
  minimumTierId: string | null;
  createdAt: Date;
  minimumTier: { id: string; name: string } | null;
};

function PostItem({ post, canView, username, pinned }: { post: PostWithTier; canView: boolean; username: string; pinned?: boolean }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted">
        {pinned ? (
          <span className="inline-flex items-center gap-1 font-semibold" style={{ color: "var(--accent)" }}>
            <Pin className="h-3.5 w-3.5" /> Pinned
          </span>
        ) : null}
        <span>{timeAgo(post.createdAt)}</span>
        {post.visibility !== "PUBLIC" ? (
          <span className="inline-flex items-center gap-1">
            · <BrandIcon name="lock" className="h-3.5 w-3.5" />
            {post.minimumTier?.name ?? "Supporters"}
          </span>
        ) : null}
      </div>
      <Link href={`/${username}/post/${post.id}`} className="font-semibold hover:underline">
        {post.title}
      </Link>
      {canView ? (
        <p className="mt-1 line-clamp-3 text-sm text-muted">{post.content}</p>
      ) : (
        <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
          <BrandIcon name="lock" className="mr-1 h-4 w-4 align-text-bottom" />This post is for supporters.{" "}
          <a href="#support" className="font-semibold" style={{ color: "var(--accent)" }}>
            Unlock it
          </a>
        </p>
      )}
    </div>
  );
}

function SupportItem({
  support,
}: {
  support: { id: string; supporterName: string; message: string | null; coffees: number; createdAt: Date; supporter: { username: string; avatarUrl: string | null } | null };
}) {
  return (
    <div className="flex gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-sm">
        {support.supporter?.avatarUrl ? (
          <img src={support.supporter.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
        ) : (
          <BrandIcon name="coffee" className="h-7 w-7" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-semibold">{support.supporterName}</span>{" "}
          <span className="text-muted">
            bought {support.coffees} {support.coffees === 1 ? "coffee" : "coffees"} · {timeAgo(support.createdAt)}
          </span>
        </p>
        {support.message ? <p className="mt-0.5 text-sm">{support.message}</p> : null}
      </div>
    </div>
  );
}
