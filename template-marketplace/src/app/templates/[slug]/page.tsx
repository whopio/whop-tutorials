import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Link2, Star, ExternalLink } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTemplateBySlug } from "@/lib/templates";
import { toolByValue, categoryByValue } from "@/constants/categories";

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const template = await getTemplateBySlug(slug);
  if (!template || template.status !== "PUBLISHED") notFound();

  const tool = toolByValue(template.tool);
  const category = categoryByValue(template.category);
  const previews = template.files.filter((f) => f.kind === "PREVIEW");
  const downloadFiles = template.files.filter((f) => f.kind === "DOWNLOAD");
  const ratingSum = template.reviews.reduce((s, r) => s + r.stars, 0);
  const avgRating = template.reviews.length > 0 ? ratingSum / template.reviews.length : null;

  const me = await isAuthenticated();
  const purchase = me
    ? await prisma.purchase.findUnique({
        where: { userId_templateId: { userId: me.id, templateId: template.id } },
      })
    : null;
  const isOwner = me?.id === template.sellerProfile.userId;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <Link
        href="/templates"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        All templates
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-8">
          <div className="space-y-3">
            <span
              className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold"
              style={{
                color: `var(${tool.cssVar})`,
                backgroundColor: `color-mix(in srgb, var(${tool.cssVar}) 16%, transparent)`,
              }}
            >
              {tool.label} · {category.label}
            </span>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              {template.title}
            </h1>
            <Link
              href={`/sellers/${template.sellerProfile.username}`}
              className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
            >
              by{" "}
              <span className="font-medium text-[var(--color-text-primary)]">
                @{template.sellerProfile.username}
              </span>
            </Link>
            {avgRating !== null && (
              <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
                <Star className="h-4 w-4 fill-[var(--color-rating)] text-[var(--color-rating)]" />
                <span className="font-medium text-[var(--color-text-primary)]">
                  {avgRating.toFixed(1)}
                </span>
                <span>
                  ({template.reviews.length} {template.reviews.length === 1 ? "review" : "reviews"})
                </span>
              </div>
            )}
          </div>

          {previews.length > 0 && (
            <section>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previews[0].fileUrl}
                alt=""
                className="aspect-[4/3] w-full rounded-2xl border border-[var(--color-border)] object-cover"
              />
              {previews.length > 1 && (
                <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
                  {previews.slice(1).map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.id}
                      src={p.fileUrl}
                      alt=""
                      className="aspect-square w-full rounded-lg border border-[var(--color-border)] object-cover"
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          <section>
            <h2 className="font-display text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              About this template
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-[var(--color-text-secondary)]">
              {template.description || "No description provided."}
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              What&rsquo;s included
            </h2>
            <div className="mt-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              {template.deliveryType === "FILE_DOWNLOAD" ? (
                <ul className="divide-y divide-[var(--color-border)]">
                  {downloadFiles.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 py-2">
                      <FileText className="h-4 w-4 flex-shrink-0 text-[var(--color-text-secondary)]" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-text-primary)]">
                        {f.fileName}
                      </span>
                      <span className="flex-shrink-0 text-xs text-[var(--color-text-secondary)]">
                        {formatBytes(f.fileSize)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-3 py-2">
                  <Link2 className="h-4 w-4 flex-shrink-0 text-[var(--color-text-secondary)]" />
                  <span className="text-sm text-[var(--color-text-primary)]">
                    {tool.label} share URL
                  </span>
                  <span className="ml-auto text-xs text-[var(--color-text-secondary)]">
                    Revealed after purchase
                  </span>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                Reviews
              </h2>
              {purchase && !isOwner && (
                <Link
                  href={`/templates/${template.slug}/review/new`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-elevated)]"
                >
                  <Star className="h-3 w-3" />
                  {template.reviews.some((r) => r.userId === me?.id)
                    ? "Edit your review"
                    : "Write a review"}
                </Link>
              )}
            </div>

            {template.reviews.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                No reviews yet.{" "}
                {purchase && !isOwner ? "Be the first." : "Buyers can leave reviews after purchase."}
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {template.reviews.slice(0, 10).map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={`h-3.5 w-3.5 ${
                              idx < r.stars
                                ? "fill-[var(--color-rating)] text-[var(--color-rating)]"
                                : "text-[var(--color-border)]"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {r.user.name ?? "Buyer"}
                        {r.userId === me?.id && (
                          <span className="ml-2 rounded bg-[var(--color-accent-subtle)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                            You
                          </span>
                        )}
                        {" · "}
                        {r.createdAt.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {r.title && (
                      <p className="mt-2 font-semibold text-[var(--color-text-primary)]">
                        {r.title}
                      </p>
                    )}
                    {r.body && (
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        {r.body}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Purchase card */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <p className="font-display text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {formatPrice(template.price)}
            </p>

            <div className="mt-4 space-y-2">
              {isOwner ? (
                <Link
                  href={`/sell/templates/${template.id}/edit`}
                  className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-elevated)]"
                >
                  Edit your template
                </Link>
              ) : purchase ? (
                <Link
                  href={`/templates/${template.slug}/access`}
                  className="block w-full rounded-lg bg-[var(--color-success)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Open template
                </Link>
              ) : !me ? (
                <Link
                  href="/sign-in"
                  prefetch={false}
                  className="block w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
                >
                  Sign in to {template.price === 0 ? "claim" : "buy"}
                </Link>
              ) : template.price === 0 ? (
                <FreeBuyForm templateId={template.id} />
              ) : (
                <a
                  href={template.whopCheckoutUrl ?? "#"}
                  className="block w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
                >
                  Buy now
                </a>
              )}
            </div>

            <ul className="mt-5 space-y-2 text-xs text-[var(--color-text-secondary)]">
              {template.deliveryType === "FILE_DOWNLOAD" ? (
                <li className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-3 w-3 flex-shrink-0" />
                  {downloadFiles.length} downloadable {downloadFiles.length === 1 ? "file" : "files"}, instant delivery
                </li>
              ) : (
                <li className="flex items-start gap-2">
                  <Link2 className="mt-0.5 h-3 w-3 flex-shrink-0" />
                  {tool.label} share URL revealed after purchase
                </li>
              )}
              <li className="flex items-start gap-2">
                <ExternalLink className="mt-0.5 h-3 w-3 flex-shrink-0" />
                Secure checkout via Whop
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

function FreeBuyForm({ templateId }: { templateId: string }) {
  return (
    <form action={`/api/templates/${templateId}/purchase`} method="post">
      <button
        type="submit"
        className="w-full rounded-lg bg-[var(--color-success)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
      >
        Get for free
      </button>
    </form>
  );
}
