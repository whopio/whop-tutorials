/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { accentHex } from "@/lib/accent";
import ThemeToggle from "@/components/ThemeToggle";
import CreatorSearch from "@/components/CreatorSearch";
import BrandIcon from "@/components/BrandIcon";
import { ChevronLeft, ChevronRight } from "@/components/Icons";

const PAGE_SIZE = 12;

type ExploreCreator = {
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  accentColor: string;
  supporters: number;
};

function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const skip = (page - 1) * PAGE_SIZE;

  const where = { isActive: true, whopOnboarded: true } as const;

  const [total, creators] = await Promise.all([
    prisma.creator.count({ where }),
    prisma.creator.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true, accentColor: true },
    }),
  ]);

  const counts =
    creators.length > 0
      ? await prisma.support.groupBy({
          by: ["creatorId"],
          where: { creatorId: { in: creators.map((c) => c.id) }, status: "COMPLETED" },
          _count: { _all: true },
        })
      : [];
  const countByCreator = new Map(counts.map((c) => [c.creatorId, c._count._all]));

  const rows: ExploreCreator[] = creators.map((c) => ({
    username: c.username,
    displayName: c.displayName,
    bio: c.bio,
    avatarUrl: c.avatarUrl,
    accentColor: c.accentColor,
    supporters: countByCreator.get(c.id) ?? 0,
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <BrandIcon name="coffee" className="h-9 w-9" />
          Cuppa
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a href="/api/auth/login" className="text-sm font-semibold">
            Log in
          </a>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Explore creators</h1>
            <p className="mt-2 text-muted">
              Discover creators to support, or jump straight to a handle you know.
            </p>
          </div>
          <div className="w-full sm:w-80">
            <CreatorSearch />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="kofi-card p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-surface-2">
              <BrandIcon name="coffee" className="h-10 w-10" />
            </div>
            <h2 className="mt-4 font-bold">No creators yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Be the first to set up a page and start earning from your fans.
            </p>
            <a href="/api/auth/login?returnTo=/dashboard/start" className="btn-pill btn-accent mt-5 text-sm">
              Get started
            </a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((c) => {
                const accent = accentHex(c.accentColor);
                return (
                  <Link
                    key={c.username}
                    href={`/${c.username}`}
                    className="kofi-card overflow-hidden transition-[filter] hover:brightness-[0.98]"
                  >
                    <div className="h-20" style={{ background: accent }} />
                    <div className="px-5 pb-5">
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
                      {c.bio ? <p className="mt-2 line-clamp-2 text-sm text-muted">{c.bio}</p> : null}
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 ? (
              <div className="mt-10 flex items-center justify-center gap-3">
                {hasPrev ? (
                  <Link href={`/explore?page=${page - 1}`} className="btn-pill btn-outline text-sm">
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Link>
                ) : (
                  <span className="btn-pill btn-outline cursor-not-allowed text-sm opacity-50"><ChevronLeft className="h-4 w-4" /> Previous</span>
                )}
                <span className="text-sm text-muted">
                  Page {page} of {totalPages}
                </span>
                {hasNext ? (
                  <Link href={`/explore?page=${page + 1}`} className="btn-pill btn-outline text-sm">
                    Next <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="btn-pill btn-outline cursor-not-allowed text-sm opacity-50">Next <ChevronRight className="h-4 w-4" /></span>
                )}
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
