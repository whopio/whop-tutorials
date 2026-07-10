import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { User } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { WavoraLogo } from "@/components/ui/wavora-logo";

export default async function StudioLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between gap-4 border-b border-border bg-canvas px-4">
        <div className="flex items-center gap-2">
          <Link href="/" aria-label="Wavora home">
            <WavoraLogo />
          </Link>
          <span className="text-sm font-medium text-fg-muted">Studio</span>
          <nav className="ml-3 hidden items-center gap-1 sm:flex">
            <Link
              href="/studio/videos"
              className="rounded-lg px-3 py-1.5 text-sm hover:bg-hover"
            >
              Content
            </Link>
            <Link
              href="/studio/monetization"
              className="rounded-lg px-3 py-1.5 text-sm hover:bg-hover"
            >
              Monetization
            </Link>
            <Link
              href="/studio/customize"
              className="rounded-lg px-3 py-1.5 text-sm hover:bg-hover"
            >
              Customize
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-fg-muted hover:text-fg">
            View site
          </Link>
          <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-hover">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-fg-muted" />
            )}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 pb-16 pt-20">{children}</main>
    </div>
  );
}
