import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100dvh-57px)] flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <p className="text-sm uppercase tracking-widest text-text-tertiary">Not found</p>
        <h1 className="mt-2 font-display text-[60px] text-text-primary leading-none">404</h1>
        <p className="mt-4 text-text-secondary">
          That URL doesn&apos;t resolve to anything we publish.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex px-6 py-2.5 rounded-pill bg-accent text-white font-medium hover:bg-accent-hover"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
