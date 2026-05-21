import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, FileText, Link2, Star, ShieldCheck } from "lucide-react";
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
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]"
      >
        <Link href="/templates" className="transition hover:text-[var(--color-text-primary)]">
          All templates
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link
          href={`/templates?tool=${template.tool}`}
          className="transition hover:text-[var(--color-text-primary)]"
        >
          {tool.label}
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span className="text-[var(--color-text-primary)]">{template.title}</span>
      </nav>

      {/* Title row */}
      <div className="mt-5">
        <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl lg:text-5xl">
          {template.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-secondary)]">
          <Link
            href={`/sellers/${template.sellerProfile.username}`}
            className="inline-flex items-center gap-2 transition hover:text-[var(--color-text-primary)]"
          >
            {template.sellerProfile.user.avatar ? (
              <Image
                src={template.sellerProfile.user.avatar}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 rounded-full border border-[var(--color-border)] object-cover"
              />
            ) : (
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent-subtle)] text-[11px] font-bold uppercase text-[var(--color-accent)]"
                aria-hidden
              >
                {template.sellerProfile.username.charAt(0).toUpperCase()}
              </span>
            )}
            <span>
              by{" "}
              <span className="font-medium text-[var(--color-text-primary)]">
                @{template.sellerProfile.username}
              </span>
            </span>
          </Link>
          {avgRating !== null && (
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-[var(--color-rating)] text-[var(--color-rating)]" />
              <span className="font-medium text-[var(--color-text-primary)]">
                {avgRating.toFixed(1)}
              </span>
              <span>
                ({template.reviews.length} {template.reviews.length === 1 ? "review" : "reviews"})
              </span>
            </span>
          )}
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
            style={{
              color: `var(${tool.cssVar})`,
              backgroundColor: `color-mix(in srgb, var(${tool.cssVar}) 12%, transparent)`,
            }}
          >
            {tool.label} · {category.label}
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-10">
        <div className="min-w-0 space-y-10">
          {/* Gallery */}
          {previews.length > 0 && (
            <section>
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-[var(--color-border)]">
                <Image
                  src={previews[0].fileUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 800px, 100vw"
                  priority
                  className="object-cover"
                />
              </div>
              {previews.length > 1 && (
                <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
                  {previews.slice(1).map((p) => (
                    <div
                      key={p.id}
                      className="relative aspect-square w-full overflow-hidden rounded-lg border border-[var(--color-border)]"
                    >
                      <Image
                        src={p.fileUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 160px, (min-width: 640px) 20vw, 25vw"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* About */}
          <section>
            <h2 className="font-display text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              About this template
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-[var(--color-text-secondary)]">
              {template.description || "No description provided."}
            </p>
          </section>

          {/* What's included */}
          <section>
            <h2 className="font-display text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              What&rsquo;s included
            </h2>
            <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              {template.deliveryType === "FILE_DOWNLOAD" ? (
                <ul className="divide-y divide-[var(--color-border)]">
                  {downloadFiles.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 px-4 py-3">
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
                <div className="flex items-center gap-3 px-4 py-3">
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

          {/* Reviews */}
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                Reviews
              </h2>
              {purchase && !isOwner && (
                <Link
                  href={`/templates/${template.slug}/review/new`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-elevated)]"
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
              <div className="mt-4 space-y-3">
                {template.reviews.slice(0, 10).map((r) => {
                  const name = r.user.name ?? "Buyer";
                  const initial = name.charAt(0).toUpperCase();
                  return (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-subtle)] text-xs font-bold uppercase text-[var(--color-accent)]"
                            aria-hidden
                          >
                            {initial}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">
                              {name}
                              {r.userId === me?.id && (
                                <span className="ml-2 rounded bg-[var(--color-accent-subtle)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              {r.createdAt.toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
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
                      </div>
                      {r.title && (
                        <p className="mt-3 font-semibold text-[var(--color-text-primary)]">
                          {r.title}
                        </p>
                      )}
                      {r.body && (
                        <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                          {r.body}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Purchase card */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-text-secondary)]">
                {template.price === 0 ? "Free template" : "One-time purchase"}
              </p>
              <p className="mt-2 font-display text-4xl font-bold tracking-tight text-[var(--color-text-primary)]">
                {formatPrice(template.price)}
              </p>

              <div className="mt-5">
                {isOwner ? (
                  <Link
                    href={`/sell/templates/${template.id}/edit`}
                    className="block w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-center text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-elevated)]"
                  >
                    Edit your template
                  </Link>
                ) : purchase ? (
                  <Link
                    href={`/templates/${template.slug}/access`}
                    className="block w-full rounded-full bg-[var(--color-success)] px-4 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Open template
                  </Link>
                ) : !me ? (
                  <a
                    href={
                      template.price === 0
                        ? "/api/auth/login"
                        : `/api/auth/login?redirect_to=${encodeURIComponent(`/templates/${template.slug}/checkout`)}`
                    }
                    className="block w-full rounded-full bg-[var(--color-accent)] px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
                  >
                    Sign in to {template.price === 0 ? "claim" : "buy"}
                  </a>
                ) : template.price === 0 ? (
                  <FreeBuyForm templateId={template.id} />
                ) : (
                  <Link
                    href={`/templates/${template.slug}/checkout`}
                    prefetch={false}
                    className="block w-full rounded-full bg-[var(--color-accent)] px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
                  >
                    Buy now
                  </Link>
                )}
              </div>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                Secure checkout via Whop
              </p>
            </div>

            {/* Metadata table */}
            <dl className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 text-sm">
              <div className="flex items-center justify-between gap-3 px-6 py-3">
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Tool
                </dt>
                <dd className="font-medium" style={{ color: `var(${tool.cssVar})` }}>
                  {tool.label}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-6 py-3">
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Category
                </dt>
                <dd className="font-medium text-[var(--color-text-primary)]">
                  {category.label}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-6 py-3">
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Delivery
                </dt>
                <dd className="inline-flex items-center gap-1.5 font-medium text-[var(--color-text-primary)]">
                  {template.deliveryType === "FILE_DOWNLOAD" ? (
                    <>
                      <FileText className="h-3.5 w-3.5" aria-hidden />
                      {downloadFiles.length} {downloadFiles.length === 1 ? "file" : "files"}
                    </>
                  ) : (
                    <>
                      <Link2 className="h-3.5 w-3.5" aria-hidden />
                      Share URL
                    </>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-6 py-3">
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Updated
                </dt>
                <dd className="font-medium text-[var(--color-text-primary)]">
                  {template.updatedAt.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
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
        className="w-full cursor-pointer rounded-full bg-[var(--color-success)] px-4 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
      >
        Get for free
      </button>
    </form>
  );
}
