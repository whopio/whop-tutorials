import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  basePath,
  searchParams,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  function makeHref(targetPage: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v && k !== "page") params.set(k, v);
    }
    if (targetPage !== 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  const visibleStart = Math.max(1, end - 4);
  const pages: number[] = [];
  for (let i = visibleStart; i <= end; i++) pages.push(i);

  return (
    <nav
      className="flex items-center justify-center gap-1.5"
      aria-label="Pagination"
    >
      <PageLink
        disabled={page <= 1}
        href={makeHref(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </PageLink>

      {visibleStart > 1 && (
        <>
          <PageLink href={makeHref(1)}>1</PageLink>
          {visibleStart > 2 && (
            <span className="px-1 text-sm text-[var(--color-text-secondary)]">…</span>
          )}
        </>
      )}

      {pages.map((p) => (
        <PageLink key={p} href={makeHref(p)} active={p === page}>
          {p}
        </PageLink>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="px-1 text-sm text-[var(--color-text-secondary)]">…</span>
          )}
          <PageLink href={makeHref(totalPages)}>{totalPages}</PageLink>
        </>
      )}

      <PageLink
        disabled={page >= totalPages}
        href={makeHref(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  active,
  disabled,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
} & Omit<React.ComponentProps<typeof Link>, "href" | "children">) {
  if (disabled) {
    return (
      <span
        aria-disabled
        className="grid h-8 min-w-8 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm text-[var(--color-text-secondary)] opacity-40"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      prefetch={false}
      {...rest}
      className={`grid h-8 min-w-8 place-items-center rounded-md border px-2 text-sm transition ${
        active
          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]"
      }`}
    >
      {children}
    </Link>
  );
}
