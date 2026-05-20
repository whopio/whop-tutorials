"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CATEGORIES } from "@/constants/categories";

const NAV_CATEGORIES = CATEGORIES.filter((c) => c.value !== "OTHER");

export function NavCategoryBar() {
  const pathname = usePathname();
  const params = useSearchParams();

  // Only show the category bar on the marketplace grid (not on detail pages).
  if (pathname !== "/templates") return null;

  const activeTool = params?.get("tool") ?? null;
  const activeCategory = params?.get("category") ?? null;
  const q = params?.get("q") ?? null;

  const buildHref = (categoryValue: string | null) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (activeTool) next.set("tool", activeTool);
    if (categoryValue) next.set("category", categoryValue);
    const qs = next.toString();
    return `/templates${qs ? `?${qs}` : ""}`;
  };

  return (
    <nav
      aria-label="Browse by category"
      className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-0">
          <CategoryPill href={buildHref(null)} active={!activeCategory}>
            All
          </CategoryPill>
          {NAV_CATEGORIES.map((cat) => (
            <CategoryPill
              key={cat.value}
              href={buildHref(cat.value)}
              active={activeCategory === cat.value}
            >
              {cat.label}
            </CategoryPill>
          ))}
        </div>
      </div>
    </nav>
  );
}

function CategoryPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
        active
          ? "bg-[var(--color-text-primary)] text-[var(--color-surface)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
      }`}
    >
      {children}
    </Link>
  );
}
