import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { listPublishedTemplates } from "@/lib/templates";
import { TemplatesGrid } from "@/components/TemplatesGrid";
import { Pagination } from "@/components/Pagination";
import { ToolIcon } from "@/components/ToolIcon";
import type { Tool } from "@/generated/prisma/client";

const tools: Array<{ name: string; value: Tool; color: string }> = [
  // Clone-URL tools
  { name: "Notion", value: "NOTION", color: "var(--color-tool-notion)" },
  { name: "Figma", value: "FIGMA", color: "var(--color-tool-figma)" },
  { name: "Webflow", value: "WEBFLOW", color: "var(--color-tool-webflow)" },
  { name: "Framer", value: "FRAMER", color: "var(--color-tool-framer)" },
  // File-download tools
  { name: "Code", value: "CODE", color: "var(--color-tool-code)" },
  { name: "Word", value: "DOCX", color: "var(--color-tool-docx)" },
  { name: "Excel", value: "XLSX", color: "var(--color-tool-xlsx)" },
  { name: "PowerPoint", value: "PPTX", color: "var(--color-tool-pptx)" },
  { name: "AI Prompts", value: "AI_PROMPT", color: "var(--color-tool-ai-prompt)" },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const user = await isAuthenticated();

  const { items, total, pageSize } = await listPublishedTemplates({
    page,
    sort: "recent",
  });

  return (
    <main className="relative">
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="hero-mesh" aria-hidden>
          <span />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pb-24 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-5xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-6xl lg:text-7xl">
              Templates for every tool
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-text-secondary)] sm:text-xl">
              Notion duplicates, Figma kits, Webflow clones, Framer remixes, code
              starters, Word and Excel templates, pitch decks, AI prompts. One
              marketplace, every format, paid out fast via the Whop Payments
              Network.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/templates"
                className="group inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
              >
                Browse all templates
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {!user && (
                <Link
                  href="/sign-in"
                  prefetch={false}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/70 px-6 py-3 text-base font-medium text-[var(--color-text-primary)] backdrop-blur transition hover:bg-[var(--color-surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tools row, each tile links to the discover page filtered to that tool */}
      <section
        id="tools"
        className="relative border-y border-[var(--color-border)] bg-[var(--color-surface)]/40"
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
            Built for the tools you already use
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tools.map((tool) => (
              <Link
                key={tool.value}
                href={`/templates?tool=${tool.value}`}
                prefetch={false}
                className="group flex items-center justify-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-accent)_40%,var(--color-border))] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
              >
                <ToolIcon
                  tool={tool.value}
                  className="h-5 w-5 shrink-0"
                  style={{ color: tool.color }}
                />
                <span
                  className="text-sm font-semibold tracking-tight"
                  style={{ color: tool.color }}
                >
                  {tool.name}
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-[var(--color-text-secondary)]">
            Clone-URL tools (Notion, Figma, Webflow, Framer) ship as share links revealed
            after purchase. Files (.docx, .xlsx, .pptx, .zip, .txt) ship as instant downloads.
          </p>
        </div>
      </section>

      {/* Latest templates */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                Latest on Stax
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
                {total === 0 ? "Templates coming soon" : `${total} templates and counting`}
              </h2>
            </div>
            {total > 0 && (
              <Link
                href="/templates"
                className="hidden text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] sm:inline-flex sm:items-center sm:gap-1"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          <div className="mt-8">
            <TemplatesGrid
              templates={items}
              emptyTitle="Templates coming soon"
              emptyDescription="Sellers are publishing the first batch, check back soon, or become a seller and be one of the first."
            />
          </div>

          <div className="mt-10">
            <Pagination
              basePath="/"
              searchParams={sp}
              page={page}
              pageSize={pageSize}
              total={total}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
