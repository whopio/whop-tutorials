import Link from "next/link";
import { X } from "lucide-react";
import { TOOLS, CATEGORIES } from "@/constants/categories";
import { TemplatesGrid } from "@/components/TemplatesGrid";
import { Pagination } from "@/components/Pagination";
import { listPublishedTemplates } from "@/lib/templates";
import type { Tool, Category } from "@/generated/prisma/client";

const TOOL_VALUES = TOOLS.map((t) => t.value);
const CATEGORY_VALUES = CATEGORIES.map((c) => c.value);

function parseTool(input: string | undefined): Tool | undefined {
  if (!input) return undefined;
  return TOOL_VALUES.includes(input as Tool) ? (input as Tool) : undefined;
}

function parseCategory(input: string | undefined): Category | undefined {
  if (!input) return undefined;
  return CATEGORY_VALUES.includes(input as Category) ? (input as Category) : undefined;
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tool?: string; category?: string; page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const tool = parseTool(sp.tool);
  const category = parseCategory(sp.category);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const q = sp.q?.trim() || undefined;

  const { items, total, pageSize } = await listPublishedTemplates({
    tool,
    category,
    q,
    page,
    sort: "recent",
  });

  const activeToolMeta = tool ? TOOLS.find((t) => t.value === tool) : null;
  const activeCategoryMeta = category ? CATEGORIES.find((c) => c.value === category) : null;

  const title = activeToolMeta
    ? `${activeToolMeta.label} templates`
    : activeCategoryMeta
      ? `${activeCategoryMeta.label} templates`
      : "All templates";

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
          Marketplace
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {total === 0
            ? "No templates yet"
            : `${total} ${total === 1 ? "template" : "templates"}`}
          {activeToolMeta && activeCategoryMeta && (
            <> · Filtered by {activeCategoryMeta.label}</>
          )}
          {q && ` · matching “${q}”`}
        </p>
      </div>

      {q && (
        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[var(--color-text-secondary)]">Search:</span>
          <Link
            href={makeHref({ ...sp, q: undefined, page: undefined })}
            prefetch={false}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-subtle)] px-3 py-1 font-medium text-[var(--color-accent)] transition hover:bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)]"
          >
            “{q}”
            <X className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Clear search</span>
          </Link>
        </div>
      )}

      <div className="mt-8">
        <TemplatesGrid
          templates={items}
          emptyTitle={
            q
              ? `No templates match “${q}”`
              : activeToolMeta
                ? `No ${activeToolMeta.label} templates yet`
                : activeCategoryMeta
                  ? `No ${activeCategoryMeta.label} templates yet`
                  : "No templates yet"
          }
          emptyDescription={
            q
              ? "Try a different keyword, or clear the search to browse everything."
              : activeToolMeta
                ? `Be the first seller to publish a ${activeToolMeta.label} template on Stax.`
                : "Templates will appear here as sellers publish them."
          }
        />
      </div>

      <div className="mt-10">
        <Pagination
          basePath="/templates"
          searchParams={sp}
          page={page}
          pageSize={pageSize}
          total={total}
        />
      </div>
    </main>
  );
}

function makeHref(sp: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/templates?${qs}` : "/templates";
}
