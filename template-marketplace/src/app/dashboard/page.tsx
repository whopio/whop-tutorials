import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TemplateCard } from "@/components/TemplateCard";
import type { TemplateCardSummary } from "@/lib/templates";

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default async function BuyerDashboardPage() {
  const user = await requireAuth();

  const purchases = await prisma.purchase.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      template: {
        include: {
          sellerProfile: { select: { username: true, headline: true } },
          _count: { select: { files: true, reviews: true } },
          reviews: { select: { stars: true } },
        },
      },
    },
  });

  const purchasedSummaries: Array<TemplateCardSummary & { purchasedAt: Date; pricePaid: number }> =
    purchases.map((p) => {
      const ratingSum = p.template.reviews.reduce((s, r) => s + r.stars, 0);
      const avgRating =
        p.template.reviews.length > 0 ? ratingSum / p.template.reviews.length : null;
      return {
        id: p.template.id,
        slug: p.template.slug,
        title: p.template.title,
        description: p.template.description,
        price: p.template.price,
        tool: p.template.tool,
        category: p.template.category,
        thumbnailUrl: p.template.thumbnailUrl,
        deliveryType: p.template.deliveryType,
        fileCount: p.template._count.files,
        reviewCount: p.template._count.reviews,
        avgRating,
        seller: {
          username: p.template.sellerProfile.username,
          headline: p.template.sellerProfile.headline,
        },
        purchasedAt: p.createdAt,
        pricePaid: p.pricePaid,
      };
    });

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">Your library</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            Welcome back, {user.name?.split(" ")[0] ?? user.email.split("@")[0]}
          </h1>
        </div>
        <Link
          href="/templates"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)] transition hover:text-[var(--color-accent-hover)]"
        >
          Browse the marketplace
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <h2 className="mt-12 font-display text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
        Purchased templates
      </h2>

      {purchasedSummaries.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]">
            <Package className="h-5 w-5" />
          </div>
          <h3 className="mt-4 font-display text-xl font-semibold text-[var(--color-text-primary)]">
            You haven&rsquo;t bought anything yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
            Browse templates from creators across every tool, Notion, Figma, Webflow, code,
            office docs, AI prompts, and more.
          </p>
          <Link
            href="/templates"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)]"
          >
            Browse marketplace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {purchasedSummaries.map((p) => (
            <div key={p.id} className="space-y-2">
              <TemplateCard template={p} />
              <p className="px-1 text-[11px] text-[var(--color-text-secondary)]">
                Purchased{" "}
                {p.purchasedAt.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                · {formatPrice(p.pricePaid)}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
