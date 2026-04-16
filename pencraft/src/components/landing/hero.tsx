import Link from "next/link";

export function Hero({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% 0%, rgba(139, 92, 246, 0.18) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 50% 100%, rgba(99, 102, 241, 0.15) 0%, transparent 60%)",
        }}
      />
      <div className="relative mx-auto flex min-h-[720px] max-w-4xl flex-col items-center justify-center px-6 py-32 text-center">
        <h1 className="font-sans text-[clamp(3rem,6vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-text-primary">
          Draft anything.
          <br />
          <span className="bg-gradient-to-r from-accent via-[#8b5cf6] to-accent bg-clip-text text-transparent">
            Refine with AI.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
          Eight writing templates. Streaming output you can polish through chat.
          Pencraft turns a few inputs into a finished draft: blog posts, emails,
          ad copy, and more.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href={isAuthenticated ? "/studio" : "/api/auth/login"}
            className="inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white shadow-[0_0_40px_rgba(99,102,241,0.35)] transition-colors hover:bg-accent-hover"
          >
            {isAuthenticated ? "Go to Studio" : "Start writing free"}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-surface/70 px-6 py-3 text-sm font-medium text-text-primary backdrop-blur-sm transition-colors hover:bg-surface-hover"
          >
            See how it works
          </Link>
        </div>
        <p className="mt-6 text-xs text-text-muted">
          Free tier: 3 templates, 5 generations per day. No credit card.
        </p>
      </div>
    </section>
  );
}
