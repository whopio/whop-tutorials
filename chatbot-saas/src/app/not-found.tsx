import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-4 w-full max-w-sm text-center">
        <h1 className="text-6xl font-bold text-zinc-200 dark:text-zinc-800">
          404
        </h1>
        <p className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Page not found
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/chat"
          className="mt-6 inline-block rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Back to chat
        </Link>
      </div>
    </div>
  );
}
