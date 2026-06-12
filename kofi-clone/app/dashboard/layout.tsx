import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";
import DashboardNav from "@/components/dashboard/DashboardNav";
import BrandIcon from "@/components/BrandIcon";
import ShareButton from "@/components/dashboard/ShareButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  // No creator yet: keep onboarding (/dashboard/start) standalone, no shell.
  if (!user.creator) {
    return <>{children}</>;
  }

  const creator = user.creator;

  return (
    <div className="min-h-dvh bg-page md:flex">
      <aside className="border-line bg-surface md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:flex-col md:border-r">
        <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold">
            <BrandIcon name="coffee" className="h-9 w-9" />
            Cuppa
          </Link>
          <div className="md:hidden">
            <ThemeToggle />
          </div>
        </div>

        <DashboardNav username={creator.username} />

        <div className="hidden px-4 pb-2 md:block">
          <ShareButton username={creator.username} />
        </div>

        <div className="hidden border-t border-line px-3 py-4 md:block">
          <div className="flex items-center justify-between px-2">
            <span className="truncate text-sm text-muted">{creator.displayName}</span>
            <ThemeToggle />
          </div>
          <a
            href="/api/auth/logout"
            className="mt-3 block rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            Log out
          </a>
        </div>
      </aside>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-5 py-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}
