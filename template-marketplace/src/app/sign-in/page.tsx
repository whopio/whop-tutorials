import { redirect } from "next/navigation";
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

  // Happy path: skip the welcome card and go straight to Whop. The page is
  // only rendered when an OAuth error needs to surface a friendly message.
  if (!error) redirect("/api/auth/login");

  const friendly = errorMessages[error] ?? `Sign-in failed (${error}).`;

  return (
    <main className="relative isolate min-h-[calc(100vh-4rem-1px)] overflow-hidden">
      <div className="hero-mesh" aria-hidden>
        <span />
      </div>

      <div className="relative mx-auto flex max-w-md flex-col items-center px-4 py-16 sm:px-6 sm:py-24">
        <div className="w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
          {/* Dark chrome header */}
          <div className="flex justify-center bg-[var(--color-chrome)] px-6 py-6">
            <div className="text-[var(--color-chrome-text)]">
              <Logo />
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-8 sm:px-8">
            <h1 className="text-center font-display text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              Welcome to Stax
            </h1>
            <p className="mt-2 text-center text-sm text-[var(--color-text-secondary)]">
              Sign in with your Whop account to browse, buy, or sell templates.
            </p>

            <div
              role="alert"
              className="mt-6 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]"
            >
              <div className="font-medium">{friendly}</div>
              {detail && (
                <pre className="mt-2 whitespace-pre-wrap break-all text-xs opacity-75">
                  {detail}
                </pre>
              )}
            </div>

            <a
              href="/api/auth/login"
              className="group mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
            >
              Continue with Whop
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>

            <p className="mt-5 text-center text-xs text-[var(--color-text-secondary)]">
              By continuing, you agree to use Stax for testing only during sandbox.
            </p>
          </div>
        </div>

        {/* Reassurance bullets below the card */}
        <ul className="mt-8 space-y-2 text-xs text-[var(--color-text-secondary)]">
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--color-accent)]" />
            <span>OAuth 2.1 with PKCE. We never see your password.</span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--color-accent)]" />
            <span>Payouts and earnings move through Whop&rsquo;s rails.</span>
          </li>
        </ul>
      </div>
    </main>
  );
}
