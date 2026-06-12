import Link from "next/link";
import { getCreatorLite } from "@/lib/creator";
import { getCurrentUser } from "@/lib/auth";
import { accentHex } from "@/lib/accent";
import ThemeToggle from "@/components/ThemeToggle";
import BrandIcon from "@/components/BrandIcon";

export default async function CreatorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [creator, user] = await Promise.all([getCreatorLite(username), getCurrentUser()]);
  const accent = accentHex(creator?.accentColor);
  const isOwner = Boolean(user?.creator && user.creator.username === username);

  return (
    <div style={{ ["--accent" as string]: accent } as React.CSSProperties} className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-2.5">
          <Link href={`/${username}`} className="flex items-center gap-2 font-bold">
            {creator?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creator.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="grid h-7 w-7 place-items-center rounded-full bg-surface-2">
                <BrandIcon name="coffee" className="h-6 w-6" />
              </span>
            )}
            <span className="truncate">{creator?.displayName ?? "Cuppa"}</span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Link href={isOwner ? "/dashboard" : "/dashboard"} className="btn-pill btn-secondary text-sm">
                {isOwner ? "My dashboard" : "Dashboard"}
              </Link>
            ) : (
              <a href={`/api/auth/login?returnTo=/${username}`} className="btn-pill btn-secondary text-sm">
                Log in
              </a>
            )}
          </div>
        </div>
      </header>

      {children}

      <footer className="mt-16 border-t border-line py-10 text-center text-sm text-muted">
        <p>
          Creating something worth supporting?{" "}
          <a href="/api/auth/login?returnTo=/dashboard" className="font-semibold text-ink underline">
            Start your own page
          </a>
        </p>
      </footer>
    </div>
  );
}
