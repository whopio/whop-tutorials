import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
      <div className="text-center">
        <h2 className="text-6xl font-extrabold text-[var(--color-accent)] mb-4">404</h2>
        <p className="text-xl text-[var(--color-text-secondary)] mb-6">Page not found</p>
        <Link
          href="/"
          className="px-6 py-3 rounded-lg bg-[var(--color-accent)] text-white font-semibold hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
