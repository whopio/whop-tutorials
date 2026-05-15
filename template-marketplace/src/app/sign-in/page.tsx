import { ArrowRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";

const errorMessages: Record<string, string> = {
  invalid_state: "Your sign-in attempt expired or was tampered with. Try again.",
  token_exchange: "Whop couldn't issue a token. Check your network and retry.",
  userinfo: "We signed you in but couldn't fetch your profile. Try again.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; detail?: string }>;
}) {
  const { error, detail } = await searchParams;
  const friendly = error ? errorMessages[error] ?? `Sign-in failed (${error}).` : null;

  return (
    <main className="relative isolate min-h-[calc(100vh-3.5rem-1px)] overflow-hidden">
      <div className="hero-mesh" aria-hidden>
        <span />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-24">
        {/* Pitch column */}
        <div className="flex flex-col justify-center">
          <Logo />
          <h1 className="mt-8 font-display text-4xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-5xl">
            Sign in to Stax.
          </h1>
          <p className="mt-4 max-w-md text-lg text-[var(--color-text-secondary)]">
            One Whop account. Browse and buy templates, or publish your own and
            get paid via the Whop Payments Network.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-[var(--color-text-secondary)]">
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-accent)]" />
              <span>OAuth 2.1 with PKCE. We never see your password.</span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-accent)]" />
              <span>Your purchases and seller earnings move through Whop&rsquo;s payout rails.</span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-accent)]" />
              <span>Sandbox-only during the build. Production switch comes later.</span>
            </li>
          </ul>
        </div>

        {/* Form card column */}
        <div className="flex items-center">
          <div className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 shadow-xl backdrop-blur sm:p-8">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              Continue with Whop
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              We&rsquo;ll redirect you to Whop&rsquo;s secure sign-in page.
            </p>

            {friendly && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/8 p-3 text-sm text-[var(--color-error)]"
              >
                <div className="font-medium">{friendly}</div>
                {detail && (
                  <pre className="mt-2 whitespace-pre-wrap break-all text-xs opacity-75">
                    {detail}
                  </pre>
                )}
              </div>
            )}

            <a
              href="/api/auth/login"
              className="group mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-6 py-3 text-base font-medium text-white transition hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
            >
              Sign in with Whop
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>

            <p className="mt-5 text-center text-xs text-[var(--color-text-secondary)]">
              By continuing, you agree to use Stax for testing only during sandbox.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
