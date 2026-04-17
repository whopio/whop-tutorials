import Link from "next/link";

export function FinalCta({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="relative border-t border-border-subtle bg-bg py-28">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(99, 102, 241, 0.2), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-tight tracking-tight text-text-primary">
          Your next draft is one click away.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-text-secondary sm:text-base">
          Sign in with Whop, pick a template, and let Pencraft do the first
          draft. You refine the rest.
        </p>
        <Link
          href={isAuthenticated ? "/studio" : "/api/auth/login"}
          className="mt-10 inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white shadow-[0_0_40px_rgba(99,102,241,0.35)] transition-colors hover:bg-accent-hover"
        >
          {isAuthenticated ? "Go to Studio" : "Start writing free"}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </Link>
      </div>
    </section>
  );
}
