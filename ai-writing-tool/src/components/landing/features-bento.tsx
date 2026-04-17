export function FeaturesBento() {
  return (
    <section className="relative border-t border-border-subtle bg-bg py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Features</p>
          <h2 className="mt-3 text-[clamp(2rem,3vw,2.75rem)] font-semibold leading-tight tracking-tight text-text-primary">
            Everything you need to get a draft off the page.
          </h2>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-6 md:grid-rows-2">
          {/* 1. Large hero tile */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 md:col-span-4 md:row-span-2">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-60"
              style={{
                background:
                  "radial-gradient(ellipse 70% 60% at 80% 20%, rgba(99, 102, 241, 0.18), transparent 65%)",
              }}
            />
            <div className="relative">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">Eight templates</span>
              <h3 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-text-primary">
                One tool for every kind of writing.
              </h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
                Blog posts, emails, social copy, ad copy, landing pages, product
                descriptions, SEO articles, press releases. Each template tuned
                with its own system prompt and input fields.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-2 text-xs text-text-tertiary">
                <div className="rounded-md border border-border-subtle bg-bg px-3 py-2">Blog post</div>
                <div className="rounded-md border border-border-subtle bg-bg px-3 py-2">Email</div>
                <div className="rounded-md border border-border-subtle bg-bg px-3 py-2">Social post</div>
                <div className="rounded-md border border-border-subtle bg-bg px-3 py-2">Ad copy</div>
                <div className="rounded-md border border-border-subtle bg-bg px-3 py-2">Landing page</div>
                <div className="rounded-md border border-border-subtle bg-bg px-3 py-2">SEO article</div>
              </div>
            </div>
          </div>

          {/* 2. Streaming output */}
          <div className="rounded-xl border border-border bg-surface p-6 md:col-span-2">
            <div className="flex h-8 items-center gap-1">
              <span className="h-1.5 w-8 animate-pulse rounded-full bg-accent" />
              <span className="h-1.5 w-5 animate-pulse rounded-full bg-accent/60" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-3 animate-pulse rounded-full bg-accent/40" style={{ animationDelay: "300ms" }} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-text-primary">Streaming output</h3>
            <p className="mt-1 text-sm text-text-secondary">Watch each draft write itself in real time, no waiting for the spinner.</p>
          </div>

          {/* 3. Refinement chat */}
          <div className="rounded-xl border border-border bg-surface p-6 md:col-span-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            <h3 className="mt-4 text-base font-semibold text-text-primary">Refinement chat</h3>
            <p className="mt-1 text-sm text-text-secondary">Iterate the draft like a conversation: &ldquo;shorter intro,&rdquo; &ldquo;more casual,&rdquo; &ldquo;new CTA.&rdquo;</p>
          </div>

          {/* 4. History (bottom left) */}
          <div className="rounded-xl border border-border bg-surface p-6 md:col-span-3">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M3 12a9 9 0 1 0 9-9 9.7 9.7 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></svg>
              <h3 className="text-base font-semibold text-text-primary">Every draft saved</h3>
            </div>
            <p className="mt-2 text-sm text-text-secondary">Your last 20 generations — with their full chat threads — are one click away in the sidebar.</p>
          </div>

          {/* 5. Dark mode (bottom right) */}
          <div className="rounded-xl border border-border bg-surface p-6 md:col-span-3">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
              <h3 className="text-base font-semibold text-text-primary">Light, dark, or system</h3>
            </div>
            <p className="mt-2 text-sm text-text-secondary">Pick your theme, or let your OS decide. Everything from the landing to the studio stays in sync.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
