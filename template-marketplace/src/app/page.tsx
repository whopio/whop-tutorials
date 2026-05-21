import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { listPublishedTemplates } from "@/lib/templates";
import { TemplatesGrid } from "@/components/TemplatesGrid";
import { Pagination } from "@/components/Pagination";
import { ToolIcon } from "@/components/ToolIcon";
import { HomeHeroSearch } from "@/components/HomeHeroSearch";
import type { Tool } from "@/generated/prisma/client";

const tools: Array<{ name: string; value: Tool; color: string }> = [
  // Clone-URL tools
  { name: "Notion", value: "NOTION", color: "var(--color-tool-notion)" },
  { name: "Figma", value: "FIGMA", color: "var(--color-tool-figma)" },
  { name: "Webflow", value: "WEBFLOW", color: "var(--color-tool-webflow)" },
  { name: "Framer", value: "FRAMER", color: "var(--color-tool-framer)" },
  { name: "WordPress", value: "WORDPRESS", color: "var(--color-tool-wordpress)" },
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

        <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-20 sm:px-6 sm:pb-24 sm:pt-32">
          <div className="text-center">
            <h1 className="font-display text-5xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-6xl lg:text-7xl">
              Templates for every tool
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-text-secondary)] sm:text-xl">
              Notion duplicates, Figma kits, Webflow clones, Framer remixes,
              WordPress themes, code starters, Word and Excel templates, pitch
              decks, AI prompts. One marketplace, every format.
            </p>

            <div className="mt-10">
              <HomeHeroSearch />
            </div>

            <p className="mt-6 text-sm text-[var(--color-text-secondary)]">
              Or{" "}
              <Link
                href="/templates"
                className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
              >
                browse all templates
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Browse by tool */}
      <section
        id="tools"
        className="relative border-y border-[var(--color-border)] bg-[var(--color-surface)]/50"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                Browse
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Templates by tool
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {tools.map((tool) => (
              <Link
                key={tool.value}
                href={`/templates?tool=${tool.value}`}
                prefetch={false}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-accent)_30%,var(--color-border))] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${tool.color} 12%, transparent)`,
                  }}
                >
                  <ToolIcon
                    tool={tool.value}
                    className="h-5 w-5"
                    style={{ color: tool.color }}
                  />
                </span>
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
            after purchase. Everything else (WordPress themes, code, .docx, .xlsx, .pptx, .zip,
            .txt) ships as instant downloads.
          </p>
        </div>
      </section>

      {/* Latest templates */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
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

          <TemplatesGrid
            templates={items}
            emptyTitle="Templates coming soon"
            emptyDescription="Sellers are publishing the first batch. Check back soon, or become a seller and be one of the first."
          />

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

      {/* Sell on Stax CTA */}
      {!user && (
        <section className="relative">
          <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-28">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F766E] via-[#0EA5A4] to-[#2DD4BF] p-10 text-white shadow-xl sm:p-14">
              {/* Soft glow accents */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-[#F59E0B]/25 blur-3xl"
              />

              <div className="relative flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                    For sellers
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                    Sell your templates
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-white/85">
                    Connected accounts handle KYC, taxes, and payouts. List a
                    template, set a price, get paid via the Whop Payments
                    Network.
                  </p>
                </div>
                <a
                  href="/api/auth/login?redirect_to=%2Fsell"
                  className="group inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0F766E] shadow-sm transition hover:bg-white/95 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F766E] sm:self-end"
                >
                  Become a seller
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
