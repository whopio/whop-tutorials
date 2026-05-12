import Link from "next/link";

export function AppShell({
  userId,
  artistHandle,
  activeHref,
  children,
}: {
  userId: string | null;
  artistHandle?: string | null;
  activeHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#121212", color: "#fff" }}>
      {/* Sidebar */}
      <aside
        className="flex-shrink-0 flex flex-col h-full py-6 px-3"
        style={{ width: 220, background: "#000" }}
      >
        <Link
          href="/"
          className="px-3 mb-7 text-xl font-extrabold tracking-tight block"
          style={{ fontFamily: "var(--font-bricolage)", color: "#fff" }}
        >
          soundify
        </Link>

        <nav className="flex flex-col gap-1">
          <SidebarLink href="/" icon={<IconHome />} label="Home" active={activeHref === "/"} />
          {userId && (
            <SidebarLink href="/library" icon={<IconLibrary />} label="Your Library" active={activeHref === "/library"} />
          )}
          {userId && (
            <SidebarLink href="/dashboard" icon={<IconDashboard />} label="Dashboard" active={activeHref === "/dashboard"} />
          )}
          {artistHandle && (
            <SidebarLink href={`/a/${artistHandle}`} icon={<IconProfile />} label="My Artist Page" active={false} />
          )}
        </nav>

        <div className="flex-1" />

        {userId ? (
          <div className="px-3">
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full text-left text-sm px-3 py-2 rounded-md transition-colors"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Log out
              </button>
            </form>
          </div>
        ) : (
          <div className="px-3 flex flex-col gap-3">
            <a
              href="/api/auth/login"
              className="text-center text-sm font-semibold py-3 rounded-full"
              style={{ background: "#7c3aed", color: "#fff" }}
            >
              Sign up free
            </a>
            <a
              href="/api/auth/login"
              className="text-center text-sm font-semibold py-3 rounded-full"
              style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }}
            >
              Log in
            </a>
          </div>
        )}
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors"
      style={{
        color: active ? "#fff" : "rgba(255,255,255,0.5)",
        background: active ? "rgba(255,255,255,0.06)" : "transparent",
      }}
    >
      {icon}
      {label}
    </Link>
  );
}

function IconHome() {
  return (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 3L2 12h3v9h6v-5h2v5h6v-9h3L12 3z" />
    </svg>
  );
}

function IconLibrary() {
  return (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}
