import Link from "next/link";
import { Star, FileText, Link2 } from "lucide-react";
import { toolByValue } from "@/constants/categories";
import type { TemplateCardSummary } from "@/lib/templates";

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function TemplateCard({ template }: { template: TemplateCardSummary }) {
  const tool = toolByValue(template.tool);
  const isFree = template.price === 0;
  const initial = template.seller.username.charAt(0).toUpperCase();

  return (
    <Link
      href={`/templates/${template.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-accent)_30%,var(--color-border))] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--color-surface-elevated)]">
        {template.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={template.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, var(${tool.cssVar}) 0%, transparent 80%)`,
              opacity: 0.25,
            }}
          />
        )}
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-[var(--color-chrome)]/85 px-2 py-0.5 text-[11px] font-medium text-[var(--color-chrome-text)] backdrop-blur-sm">
          {template.deliveryType === "FILE_DOWNLOAD" ? (
            <>
              <FileText className="h-3 w-3" aria-hidden />
              {template.fileCount} {template.fileCount === 1 ? "file" : "files"}
            </>
          ) : (
            <>
              <Link2 className="h-3 w-3" aria-hidden />
              Share URL
            </>
          )}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <span
          className="inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            color: `var(${tool.cssVar})`,
            backgroundColor: `color-mix(in srgb, var(${tool.cssVar}) 12%, transparent)`,
          }}
        >
          {tool.label}
        </span>

        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[var(--color-text-primary)]">
          {template.title}
        </h3>

        <div className="flex items-center gap-2">
          {template.seller.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={template.seller.avatarUrl}
              alt=""
              className="h-6 w-6 shrink-0 rounded-full border border-[var(--color-border)] object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-subtle)] text-[10px] font-bold uppercase text-[var(--color-accent)]"
              aria-hidden
            >
              {initial}
            </span>
          )}
          <span className="truncate text-xs text-[var(--color-text-secondary)]">
            by{" "}
            <span className="font-medium text-[var(--color-text-primary)]">
              @{template.seller.username}
            </span>
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-[var(--color-border)] pt-3">
          {template.reviewCount > 0 && template.avgRating !== null ? (
            <span className="inline-flex items-center gap-1 text-xs">
              <Star className="h-3.5 w-3.5 fill-[var(--color-rating)] text-[var(--color-rating)]" />
              <span className="font-semibold text-[var(--color-text-primary)]">
                {template.avgRating.toFixed(1)}
              </span>
              <span className="text-[var(--color-text-secondary)]">
                ({template.reviewCount})
              </span>
            </span>
          ) : (
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              New
            </span>
          )}
          <span
            className={`text-base font-bold ${
              isFree
                ? "text-[var(--color-success)]"
                : "text-[var(--color-text-primary)]"
            }`}
          >
            {formatPrice(template.price)}
          </span>
        </div>
      </div>
    </Link>
  );
}
