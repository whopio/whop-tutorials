// src/app/sign-in/page.tsx
import { Store } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Sign-in session expired. Please try again.",
  token_exchange: "Could not complete sign-in. Please try again.",
  userinfo: "Could not retrieve your profile. Please try again.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] || "Something went wrong. Please try again." : null;

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Store className="mx-auto h-12 w-12 text-accent" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold text-text-primary">
          Welcome to Shelfie
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Sign in with your Whop account to buy and sell digital products.
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-lg bg-error/10 p-3 text-sm text-error"
          >
            {errorMessage}
          </div>
        )}

        <a
          href="/api/auth/login"
          className="mt-8 block w-full rounded-lg bg-accent px-6 py-3 text-center text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          Sign in with Whop
        </a>
      </div>
    </div>
  );
}
