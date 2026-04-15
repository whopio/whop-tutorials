interface TemplateShowcaseItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  tier: "FREE" | "PRO";
}

export function TemplateShowcase({ templates }: { templates: TemplateShowcaseItem[] }) {
  return (
    <section id="templates" className="relative border-t border-border-subtle bg-bg py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Templates</p>
          <h2 className="mt-3 text-[clamp(2rem,3vw,2.75rem)] font-semibold leading-tight tracking-tight text-text-primary">
            Eight ways to start a draft.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary sm:text-base">
            Each template ships with its own system prompt and input fields.
            Three are free; five unlock with Pro.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="group relative rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/50"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-medium uppercase tracking-wider text-accent">{t.category}</span>
                {t.tier === "PRO" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Pro
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-base font-semibold text-text-primary">{t.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{t.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
