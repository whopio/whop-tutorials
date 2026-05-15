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

  return (
    <Link
      href={`/templates/${template.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surface-elevated)]">
        {template.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={template.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
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
        <span
          className="absolute left-2 top-2 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold backdrop-blur-sm"
          style={{
            color: `var(${tool.cssVar})`,
            backgroundColor: `color-mix(in srgb, var(${tool.cssVar}) 16%, transparent)`,
          }}
        >
          {tool.label}
        </span>
        <span
          className={`absolute right-2 top-2 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
            isFree
              ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
              : "bg-black/55 text-white backdrop-blur"
          }`}
        >
          {formatPrice(template.price)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--color-text-primary)]">
          {template.title}
        </h3>
        <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">
          by{" "}
          <span className="font-medium text-[var(--color-text-primary)]">
            @{template.seller.username}
          </span>
        </p>
        <div className="mt-3 flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
          {template.reviewCount > 0 && template.avgRating !== null ? (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-[var(--color-rating)] text-[var(--color-rating)]" />
              <span className="font-medium text-[var(--color-text-primary)]">
                {template.avgRating.toFixed(1)}
              </span>
              <span>({template.reviewCount})</span>
            </span>
          ) : (
            <span className="font-medium text-[var(--color-text-primary)]">New</span>
          )}
          <span>·</span>
          {template.deliveryType === "FILE_DOWNLOAD" ? (
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {template.fileCount} {template.fileCount === 1 ? "file" : "files"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              Share URL
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
