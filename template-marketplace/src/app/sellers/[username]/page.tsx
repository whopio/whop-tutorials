import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TemplatesGrid } from "@/components/TemplatesGrid";
import { Pagination } from "@/components/Pagination";
import { listPublishedTemplates } from "@/lib/templates";

export default async function SellerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { username } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const seller = await prisma.sellerProfile.findUnique({
    where: { username },
    include: {
      user: { select: { name: true, avatar: true } },
      _count: { select: { templates: { where: { status: "PUBLISHED" } } } },
    },
  });
  if (!seller) notFound();

  const { items, total, pageSize } = await listPublishedTemplates({
    sellerProfileId: seller.id,
    page,
    sort: "recent",
  });

  // Aggregate sales across the seller's templates
  const salesAgg = await prisma.purchase.aggregate({
    where: { template: { sellerProfileId: seller.id } },
    _count: true,
  });

  const initial = (seller.user.name ?? seller.username).slice(0, 1).toUpperCase();

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        {seller.user.avatar ? (
          <Image
            src={seller.user.avatar}
            alt=""
            width={96}
            height={96}
            priority
            className="h-24 w-24 rounded-full border border-[var(--color-border)] object-cover"
          />
        ) : (
          <div className="grid h-24 w-24 place-items-center rounded-full bg-[var(--color-accent-subtle)] font-display text-3xl font-bold text-[var(--color-accent)]">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">Seller</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl lg:text-5xl">
            {seller.user.name ?? seller.username}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">@{seller.username}</p>
          {seller.headline && (
            <p className="mt-2 max-w-2xl text-base text-[var(--color-text-secondary)]">
              {seller.headline}
            </p>
          )}
        </div>
        <div className="flex gap-6 text-sm text-[var(--color-text-secondary)]">
          <Stat value={String(seller._count.templates)} label="Templates" />
          <Stat value={String(salesAgg._count)} label="Sales" />
        </div>
      </div>

      {seller.bio && (
        <p className="mt-8 max-w-2xl text-base leading-relaxed text-[var(--color-text-secondary)]">
          {seller.bio}
        </p>
      )}

      <h2 className="mt-12 font-display text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
        Templates
      </h2>
      <div className="mt-4">
        <TemplatesGrid
          templates={items}
          emptyTitle="Nothing published yet"
          emptyDescription={`@${seller.username} hasn't published a template yet.`}
        />
      </div>

      <div className="mt-10">
        <Pagination
          basePath={`/sellers/${seller.username}`}
          searchParams={sp}
          page={page}
          pageSize={pageSize}
          total={total}
        />
      </div>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-xl font-bold text-[var(--color-text-primary)]">
        {value}
      </p>
      <p className="text-xs uppercase tracking-wider">{label}</p>
    </div>
  );
}
