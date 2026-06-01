"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[calc(100dvh-57px)] flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <h1 className="font-display text-[60px] text-text-primary">Something broke.</h1>
        <p className="mt-4 text-text-secondary">
          A page-level error stopped this view from rendering. Try again, or head back home.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-text-tertiary">Error ID: {error.digest}</p>
        )}
        <div className="mt-8 flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-pill bg-accent text-white font-medium hover:bg-accent-hover"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-2.5 rounded-pill border border-text-primary text-text-primary font-medium hover:bg-text-primary hover:text-background transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
