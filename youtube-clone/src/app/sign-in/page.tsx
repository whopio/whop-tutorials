import Link from "next/link";
import { WavoraLogo } from "@/components/ui/wavora-logo";

const ERRORS: Record<string, string> = {
  token_exchange_failed: "We couldn't complete sign-in. Please try again.",
  state_mismatch: "Your sign-in session expired. Please try again.",
  missing_pkce: "Your sign-in session expired. Please try again.",
  missing_code: "Sign-in didn't complete. Please try again.",
  bad_pkce: "Your sign-in session expired. Please try again.",
  access_denied: "Sign-in was cancelled.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const loginHref =
    next && next.startsWith("/") && !next.startsWith("//")
      ? `/api/auth/login?next=${encodeURIComponent(next)}`
      : "/api/auth/login";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-canvas px-4">
      <Link href="/" aria-label="Wavora home">
        <WavoraLogo className="scale-125" />
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center">
        <h1 className="text-xl font-semibold">Sign in to Wavora</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Watch, subscribe, comment, and support the creators you love.
        </p>

        {error ? (
          <p className="mt-4 rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">
            {ERRORS[error] ?? "Something went wrong. Please try again."}
          </p>
        ) : null}

        <a
          href={loginHref}
          className="mt-6 flex h-11 w-full items-center justify-center rounded-full bg-accent font-medium text-accent-fg transition hover:opacity-90"
        >
          Continue with Whop
        </a>

        <p className="mt-4 text-xs text-fg-muted">
          We use Whop to securely handle your account.
        </p>
      </div>
    </main>
  );
}
