import Link from "next/link";

const FREE_FEATURES = [
  "3 writing templates",
  "5 generations per day",
  "Refinement chat on every draft",
  "Last 20 generations saved",
];

const PRO_FEATURES = [
  "All 8 writing templates",
  "Unlimited generations",
  "Refinement chat on every draft",
  "Last 20 generations saved",
  "Priority support",
];

export function Pricing({ isAuthenticated, proCheckoutUrl }: { isAuthenticated: boolean; proCheckoutUrl: string }) {
  return (
    <section id="pricing" className="relative border-t border-border-subtle bg-bg py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Pricing</p>
          <h2 className="mt-3 text-[clamp(2rem,3vw,2.75rem)] font-semibold leading-tight tracking-tight text-text-primary">
            Start free. Upgrade when you&apos;re ready.
          </h2>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-4 md:grid-cols-2">
          {/* Free card */}
          <div className="flex flex-col rounded-xl border border-border bg-surface p-8">
            <h3 className="text-lg font-semibold text-text-primary">Free</h3>
            <p className="mt-1 text-sm text-text-secondary">For occasional drafts.</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight text-text-primary">$0</span>
              <span className="text-sm text-text-tertiary">/mo</span>
            </div>
            <ul className="mt-8 space-y-3 text-sm text-text-secondary">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 text-success"><path d="M20 6 9 17l-5-5"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={isAuthenticated ? "/studio" : "/api/auth/login"}
              className="mt-auto inline-flex items-center justify-center rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
            >
              {isAuthenticated ? "Open studio" : "Get started"}
            </Link>
          </div>

          {/* Pro card — highlighted */}
          <div className="relative flex flex-col overflow-hidden rounded-xl border-2 border-accent bg-surface p-8 shadow-[0_0_40px_rgba(99,102,241,0.15)]">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-60"
              style={{
                background:
                  "radial-gradient(ellipse 90% 50% at 50% 0%, rgba(139, 92, 246, 0.12), transparent 70%)",
              }}
            />
            <div className="relative flex flex-col flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-primary">Pro</h3>
                <span className="rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-semibold text-accent">Most popular</span>
              </div>
              <p className="mt-1 text-sm text-text-secondary">For anyone writing regularly.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-text-primary">$20</span>
                <span className="text-sm text-text-tertiary">/mo</span>
              </div>
              <ul className="mt-8 space-y-3 text-sm text-text-secondary">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 text-accent"><path d="M20 6 9 17l-5-5"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={proCheckoutUrl}
                className="mt-auto inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-text-muted">
          Billing handled by Whop. Cancel anytime.
        </p>
      </div>
    </section>
  );
}
