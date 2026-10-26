import { ArrowRight } from "lucide-react";

export function SignInPanel() {
  return (
    <section
      id="sign-in"
      aria-labelledby="sign-in-heading"
      className="bg-[color:var(--color-surface)] rounded-[var(--radius-lg)] border border-[color:var(--color-border)] shadow-[var(--shadow-card)] p-8 flex flex-col gap-5 max-w-lg mx-auto"
    >
      <header className="flex flex-col gap-2">
        <h1
          id="sign-in-heading"
          className="font-serif text-3xl sm:text-4xl"
        >
          Try the demo
        </h1>
        <p className="text-base text-[color:var(--color-fg-muted)]">
          Enter any email to create a temporary demo account. This stands in
          for the auth system your existing SaaS already has.
        </p>
      </header>
      <form
        action="/api/auth/login"
        method="POST"
        className="flex flex-col gap-3"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wider font-medium text-[color:var(--color-fg-muted)]">
            Email
          </span>
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="w-full h-12 rounded-[var(--radius-sm)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 text-base focus:border-[color:var(--color-accent-primary)] transition-colors"
          />
        </label>
        <button
          type="submit"
          className="w-full h-12 rounded-[var(--radius-sm)] bg-[color:var(--color-accent-primary)] hover:bg-[color:var(--color-accent-primary-hover)] text-[color:var(--color-accent-primary-fg)] font-semibold text-base inline-flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98]"
        >
          Continue
          <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </form>
      <p className="text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
        Not real auth. No password, no verification. The next step picks a
        plan and takes you through the sandbox checkout.
      </p>
    </section>
  );
}
