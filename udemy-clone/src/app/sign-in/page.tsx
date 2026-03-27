import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-full flex items-center justify-center px-8">
      <div className="w-full max-w-sm p-10 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
        <h1 className="text-2xl font-bold mb-2">Courstar</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-10">
          Learn from the best creators on the internet
        </p>
        <a
          href="/api/auth/login"
          className="block w-full py-3.5 px-4 rounded-lg bg-[var(--color-accent)] text-white font-semibold hover:bg-[var(--color-accent-hover)]"
        >
          Sign in with Whop
        </a>
        <Link
          href="/"
          className="block mt-5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
