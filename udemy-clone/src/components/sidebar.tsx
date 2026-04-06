"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Search,
  BookOpen,
  LayoutDashboard,
  PlusCircle,
  GraduationCap,
  LogIn,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";

interface SidebarUser {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: (pathname: string) => boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({
  user,
  isInstructor,
}: {
  user: SidebarUser | null;
  isInstructor: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  const sections: NavSection[] = [
    {
      title: "Discover",
      items: [
        {
          label: "Home",
          href: "/",
          icon: Home,
          match: (p) => p === "/",
        },
        {
          label: "Browse Courses",
          href: "/courses",
          icon: Search,
          match: (p) =>
            p === "/courses" ||
            (p.startsWith("/courses/") && !p.includes("/learn/")),
        },
      ],
    },
  ];

  if (user) {
    sections.push({
      title: "Learning",
      items: [
        {
          label: "My Courses",
          href: "/dashboard",
          icon: BookOpen,
          match: (p) => p === "/dashboard",
        },
      ],
    });
  }

  if (isInstructor) {
    sections.push({
      title: "Teaching",
      items: [
        {
          label: "Dashboard",
          href: "/teach/dashboard",
          icon: LayoutDashboard,
          match: (p) => p === "/teach/dashboard",
        },
        {
          label: "Create Course",
          href: "/teach/courses/new",
          icon: PlusCircle,
          match: (p) => p === "/teach/courses/new",
        },
      ],
    });
  } else if (user) {
    sections.push({
      title: "Teaching",
      items: [
        {
          label: "Become Instructor",
          href: "/teach",
          icon: GraduationCap,
          match: (p) => p.startsWith("/teach"),
        },
      ],
    });
  }

  const navContent = (
    <>
      <nav className="flex-1 px-3 space-y-6 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-2 text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  item.match?.(pathname) ?? pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active
                          ? "bg-[var(--color-accent)]/15 text-[var(--color-accent-active)] font-medium"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]"
                      }`}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--color-border)]">
        {user ? (
          <div className="space-y-0.5">
            <div className="flex items-center gap-3 px-3 py-2">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white text-xs font-bold">
                  {(user.name || "?")[0].toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium truncate">
                {user.name || "User"}
              </span>
            </div>
            <a
              href="/api/auth/logout"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </a>
          </div>
        ) : (
          <Link
            href="/sign-in"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === "/sign-in"
                ? "bg-[var(--color-accent)]/15 text-[var(--color-accent-active)] font-medium"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]"
            }`}
          >
            <LogIn className="w-5 h-5" />
            <span>Sign In</span>
          </Link>
        )}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="flex items-center gap-3 px-3 py-2 mt-0.5 w-full rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] transition-colors"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
          <span>{resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-4 gap-3 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-lg text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/" className="text-lg font-bold text-[var(--color-text-primary)]">
          Courstar
        </Link>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="w-72 h-full flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-5 flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="text-xl font-bold text-[var(--color-text-primary)]"
              >
                Courstar
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 h-screen sticky top-0 flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)]">
        <div className="px-5 py-5">
          <Link
            href="/"
            className="text-xl font-bold text-[var(--color-text-primary)]"
          >
            Courstar
          </Link>
        </div>
        {navContent}
      </aside>
    </>
  );
}
