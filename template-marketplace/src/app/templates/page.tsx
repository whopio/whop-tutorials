import Link from "next/link";
import { TOOLS } from "@/constants/categories";
import { TemplatesGrid } from "@/components/TemplatesGrid";
import { Pagination } from "@/components/Pagination";
import { listPublishedTemplates } from "@/lib/templates";
import type { Tool } from "@/generated/prisma/client";

const TOOL_VALUES = TOOLS.map((t) => t.value);

function parseTool(input: string | undefined): Tool | undefined {
  if (!input) return undefined;
  return TOOL_VALUES.includes(input as Tool) ? (input as Tool) : undefined;
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tool?: string; page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const tool = parseTool(sp.tool);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const q = sp.q?.trim() || undefined;

  const { items, total, pageSize } = await listPublishedTemplates({
    tool,
    q,
    page,
    sort: "recent",
  });

  const activeToolMeta = tool ? TOOLS.find((t) => t.value === tool) : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Marketplace
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            {activeToolMeta ? `${activeToolMeta.label} templates` : "All templates"}
          </h1>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {total === 0
            ? "No templates yet"
            : `${total} ${total === 1 ? "template" : "templates"}`}
        </p>
      </div>

      <div className="mt-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="flex gap-2 pb-2 sm:flex-wrap sm:pb-0">
          <ToolFilterPill href={makeHref({ ...sp, tool: undefined, page: undefined })} active={!tool}>
            All
          </ToolFilterPill>
          {TOOLS.filter((t) => t.value !== "OTHER").map((t) => {
            const isActive = tool === t.value;
            return (
              <ToolFilterPill
                key={t.value}
                href={makeHref({ ...sp, tool: t.value, page: undefined })}
                active={isActive}
                color={`var(${t.cssVar})`}
              >
                {t.label}
              </ToolFilterPill>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <TemplatesGrid
          templates={items}
          emptyTitle={
            activeToolMeta
              ? `No ${activeToolMeta.label} templates yet`
              : "No templates yet"
          }
          emptyDescription={
            activeToolMeta
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

function ToolFilterPill({
  href,
  active,
  color,
  children,
}: {
  href: string;
  active: boolean;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]"
      }`}
      style={!active && color ? { color } : undefined}
    >
      {children}
    </Link>
  );
}
