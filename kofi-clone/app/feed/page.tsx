/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accentHex } from "@/lib/accent";
import ThemeToggle from "@/components/ThemeToggle";
import CreatorSearch from "@/components/CreatorSearch";
import BrandIcon from "@/components/BrandIcon";

type CreatorRow = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  accentColor: string;
};

type FeedCreator = CreatorRow & {
  supporters: number;
  latestPost: { id: string; title: string } | null;
};

const CREATOR_SELECT = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  accentColor: true,
} as const;

// Attach a completed-support count and latest public post to each creator.
async function decorate(rows: CreatorRow[]): Promise<FeedCreator[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((c) => c.id);
  const [counts, posts] = await Promise.all([
    prisma.support.groupBy({
      by: ["creatorId"],
      where: { creatorId: { in: ids }, status: "COMPLETED" },
      _count: { _all: true },
    }),
    prisma.post.findMany({
      where: { creatorId: { in: ids }, published: true, visibility: "PUBLIC" },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, creatorId: true },
    }),
  ]);
  const countByCreator = new Map(counts.map((c) => [c.creatorId, c._count._all]));
  const latestByCreator = new Map<string, { id: string; title: string }>();
  for (const p of posts) {
    if (!latestByCreator.has(p.creatorId)) latestByCreator.set(p.creatorId, { id: p.id, title: p.title });
  }
  return rows.map((c) => ({
    ...c,
    supporters: countByCreator.get(c.id) ?? 0,
    latestPost: latestByCreator.get(c.id) ?? null,
  }));
}

export default async function FeedPage() {
  const user = await requireAuth();

  // "Creators you support" = active memberships + completed tips + follows.
  const [memberships, supports, follows] = await Promise.all([
    prisma.membership.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      select: { creatorId: true },
    }),
    prisma.support.findMany({
      where: { supporterUserId: user.id, status: "COMPLETED" },
      select: { creatorId: true },
    }),
    prisma.follow.findMany({
      where: { userId: user.id },
      select: { creatorId: true },
    }),
  ]);
  const supportedIds = Array.from(
    new Set([...memberships, ...supports, ...follows].map((r) => r.creatorId)),
  );

  let supported: FeedCreator[] = [];
  if (supportedIds.length > 0) {
    const rows = await prisma.creator.findMany({
      where: { id: { in: supportedIds } },
      orderBy: { createdAt: "desc" },
      select: CREATOR_SELECT,
    });
    supported = await decorate(rows);
  }

  // Empty state: suggest the 3 most-supported creators.
  let suggestions: FeedCreator[] = [];
  if (supported.length === 0) {
    const rows = await prisma.creator.findMany({
      where: {
        isActive: true,
        whopOnboarded: true,
        ...(user.creator ? { id: { not: user.creator.id } } : {}),
      },
      select: CREATOR_SELECT,
    });
    const decorated = await decorate(rows);
    suggestions = decorated.sort((a, b) => b.supporters - a.supporters).slice(0, 3);
  }

  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <BrandIcon name="coffee" className="h-9 w-9" />
          Cuppa
        </Link>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Link href="/explore" className="hidden sm:block hover:text-muted">
            Explore
          </Link>
          {user.creator ? (
            <Link href="/dashboard" className="hover:text-muted">
              Dashboard
            </Link>
          ) : (
            <Link href="/dashboard/start" className="hover:text-muted">
              Become a creator
            </Link>
          )}
          <ThemeToggle />
          <a href="/api/auth/logout" className="text-muted hover:text-ink">
            Log out
          </a>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-5 py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Your feed</h1>
            <p className="mt-2 text-muted">The creators you support, all in one place.</p>
          </div>
          <div className="w-full sm:w-80">
            <CreatorSearch />
          </div>
        </div>

        {supported.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {supported.map((c) => {
              const accent = accentHex(c.accentColor);
              return (
                <div key={c.username} className="kofi-card overflow-hidden">
                  <Link href={`/${c.username}`} className="block transition-[filter] hover:brightness-[0.98]">
                    <div className="h-16" style={{ background: accent }} />
                    <div className="px-5">
                      <div className="-mt-8 grid h-16 w-16 place-items-center overflow-hidden rounded-full border-4 border-surface bg-surface-2">
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <BrandIcon name="coffee" className="h-10 w-10" />
                        )}
                      </div>
                      <p className="mt-3 truncate text-lg font-bold">{c.displayName}</p>
                      <p className="text-sm text-muted">
                        {c.supporters} {c.supporters === 1 ? "supporter" : "supporters"}
                      </p>
                    </div>
                  </Link>
                  <div className="px-5 pb-5 pt-3">
                    {c.latestPost ? (
                      <Link
                        href={`/${c.username}/post/${c.latestPost.id}`}
                        className="block rounded-xl bg-surface-2 px-4 py-3 text-sm transition hover:brightness-[0.98]"
                      >
                        <span className="text-muted">Latest post</span>
                        <span className="mt-0.5 block truncate font-semibold">{c.latestPost.title}</span>
                      </Link>
                    ) : c.bio ? (
                      <p className="line-clamp-2 text-sm text-muted">{c.bio}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="kofi-card p-8 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-surface-2">
                <BrandIcon name="coffee" className="h-10 w-10" />
              </div>
              <h2 className="mt-4 text-xl font-bold">You&rsquo;re not supporting anyone yet</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                Follow or tip a creator and they&rsquo;ll show up here. Here are a few to get you started.
              </p>
            </div>

            {suggestions.length > 0 ? (
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
                {suggestions.map((c) => {
                  const accent = accentHex(c.accentColor);
                  return (
                    <Link
                      key={c.username}
                      href={`/${c.username}`}
                      className="kofi-card overflow-hidden transition-[filter] hover:brightness-[0.98]"
                    >
                      <div className="h-16" style={{ background: accent }} />
                      <div className="px-5 pb-5">
                        <div className="-mt-8 grid h-14 w-14 place-items-center overflow-hidden rounded-full border-4 border-surface bg-surface-2">
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <BrandIcon name="coffee" className="h-9 w-9" />
                          )}
                        </div>
                        <p className="mt-3 truncate font-bold">{c.displayName}</p>
                        <p className="text-sm text-muted">
                          {c.supporters} {c.supporters === 1 ? "supporter" : "supporters"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-6 text-center">
              <Link href="/explore" className="btn-pill btn-outline text-sm">
                Browse all creators
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
