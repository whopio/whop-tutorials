import Image from "next/image";
import Link from "next/link";
import { Plus, Package, DollarSign, Star, Pencil, Tag } from "lucide-react";
import { requireSeller } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toolByValue } from "@/constants/categories";
import { PayoutsButton } from "@/components/PayoutsButton";

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function SellerDashboardPage() {
  const { seller } = await requireSeller();

  const templates = await prisma.template.findMany({
    where: { sellerProfileId: seller.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { purchases: true, reviews: true, files: true } },
      purchases: { select: { pricePaid: true } },
      reviews: { select: { stars: true } },
    },
  });

  const totals = templates.reduce(
    (acc, t) => {
      const revenue = t.purchases.reduce((s, p) => s + p.pricePaid, 0);
      acc.revenue += revenue;
      acc.sales += t._count.purchases;
      const ratingSum = t.reviews.reduce((s, r) => s + r.stars, 0);
      if (t.reviews.length > 0) {
        acc.ratingSum += ratingSum;
        acc.ratingCount += t.reviews.length;
      }
      return acc;
    },
    { revenue: 0, sales: 0, ratingSum: 0, ratingCount: 0 },
  );

  const avgRating =
    totals.ratingCount > 0 ? (totals.ratingSum / totals.ratingCount).toFixed(1) : "0.0";

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">Seller dashboard</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl lg:text-5xl">
            @{seller.username}
          </h1>
          {seller.headline && (
            <p className="mt-2 text-base text-[var(--color-text-secondary)]">
              {seller.headline}
            </p>
          )}
        </div>
        <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center">
          <PayoutsButton />
          <Link
            href="/sell/templates/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
          >
            <Plus className="h-4 w-4" />
            New template
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total earnings" value={formatPrice(totals.revenue)} icon={DollarSign} />
        <Stat label="Total sales" value={String(totals.sales)} icon={Package} />
        <Stat label="Templates" value={String(templates.length)} icon={Package} />
        <Stat label="Avg rating" value={avgRating} icon={Star} />
      </div>

      <h2 className="mt-12 font-display text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
        Your templates
      </h2>

      {templates.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-12 text-center">
          <h3 className="font-display text-xl font-semibold text-[var(--color-text-primary)]">
            No templates yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
            Publish your first template to start earning.
          </p>
          <Link
            href="/sell/templates/new"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)]"
          >
            <Plus className="h-4 w-4" />
            Create your first template
          </Link>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                <th className="px-4 py-3 text-left font-medium">Template</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Tool</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Sales</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => {
                const tool = toolByValue(t.tool);
                const revenue = t.purchases.reduce((s, p) => s + p.pricePaid, 0);
                return (
                  <tr key={t.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {t.thumbnailUrl ? (
                          <Image
                            src={t.thumbnailUrl}
                            alt=""
                            width={40}
                            height={40}
                            sizes="40px"
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-[var(--color-surface-elevated)]" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--color-text-primary)]">
                            {t.title}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            {t._count.files} files · {t._count.reviews} reviews
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.status === "PUBLISHED"
                            ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                            : t.status === "ARCHIVED"
                              ? "bg-[var(--color-text-secondary)]/15 text-[var(--color-text-secondary)]"
                              : "bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
                        }`}
                      >
                        {t.status === "PUBLISHED"
                          ? "Published"
                          : t.status === "ARCHIVED"
                            ? "Archived"
                            : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: `var(${tool.cssVar})` }}
                      >
                        {tool.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-primary)]">
                      {formatPrice(t.price)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-primary)]">
                      {t._count.purchases}
                      {revenue > 0 && (
                        <span className="ml-1 text-xs text-[var(--color-text-secondary)]">
                          ({formatPrice(revenue)})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {t.status === "PUBLISHED" && (
                          <Link
                            href={`/sell/templates/${t.id}/edit#promo-codes`}
                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]"
                          >
                            <Tag className="h-3 w-3" />
                            Codes
                          </Link>
                        )}
                        <Link
                          href={`/sell/templates/${t.id}/edit`}
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Package;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
          {label}
        </p>
        <Icon className="h-4 w-4 text-[var(--color-text-secondary)]" />
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-[var(--color-text-primary)]">
        {value}
      </p>
    </div>
  );
}
