import { cookies } from "next/headers";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SidebarProvider } from "./SidebarProvider";
import { TopNav } from "./TopNav";
import { LeftSidebar } from "./LeftSidebar";
import { Footer } from "./Footer";

/**
 * Server shell mounted from the root layout. Fetches the current user (and
 * their first few followed writers, for the sidebar's Following section),
 * reads the sidebar_collapsed cookie, and hands both off to SidebarProvider.
 *
 * SidebarProvider renders the wrapper that owns the `--sidebar-w` CSS variable,
 * so the inline style re-renders on every toggle and the main-content padding
 * transition fires. Signed-out users get the provider in a permanently
 * "collapsed" (0px) state since they have no sidebar to show.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cookieCollapsed = cookieStore.get("sidebar_collapsed")?.value === "1";

  const user = await getAuthUser();

  let followingWriters: { username: string; name: string | null; avatar: string | null }[] = [];
  if (user) {
    const follows = await prisma.follow.findMany({
      where: { followerUserId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        followed: { select: { username: true, name: true, avatar: true } },
      },
    });
    followingWriters = follows.map((f) => f.followed);
  }

  // Signed-in users start from the cookie's state. Signed-out users have no
  // sidebar, so we lock the provider to "collapsed" — keeps `--sidebar-w` at
  // 0px and main-content padding at 0 (no offset).
  const initialCollapsed = !user || cookieCollapsed;

  return (
    <SidebarProvider initialCollapsed={initialCollapsed}>
      <TopNav signedIn={Boolean(user)} />
      {user && (
        <LeftSidebar
          username={user.username}
          followingWriters={followingWriters}
        />
      )}
      <main
        id="main"
        className="flex-1 transition-[padding] duration-200 lg:pl-[var(--sidebar-w,0px)]"
      >
        {children}
      </main>
      <div className="lg:pl-[var(--sidebar-w,0px)] transition-[padding] duration-200">
        <Footer />
      </div>
    </SidebarProvider>
  );
}
