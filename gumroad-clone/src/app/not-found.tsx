import Link from "next/link";
import { Store } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <Store className="h-16 w-16 text-text-secondary/20" />
      <h1 className="mt-6 text-4xl font-extrabold text-text-primary">404</h1>
      <p className="mt-2 text-lg text-text-secondary">
        This page doesn&apos;t exist.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          Go Home
        </Link>
        <Link
          href="/products"
          className="rounded-lg border border-border px-6 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-elevated transition-colors"
        >
          Browse Products
        </Link>
      </div>
    </div>
  );
}
