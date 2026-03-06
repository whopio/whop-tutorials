import Link from "next/link";
import { PenLine, LayoutDashboard, Compass, Settings, LogOut } from "lucide-react";
import { NotificationBell } from "./notification-bell";

interface NavUser {
  id: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

interface NavProps {
  user?: NavUser | null;
}

export function Nav({ user }: NavProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-serif text-xl font-bold text-gray-900">
            Penstack
          </Link>
          <div className="hidden items-center gap-1 sm:flex">
            <Link href="/" className="btn-ghost">
              <Compass className="mr-1.5 h-4 w-4" />
              Explore
            </Link>
            {user && (
              <>
                <Link href="/write" className="btn-ghost">
                  <PenLine className="mr-1.5 h-4 w-4" />
                  Write
                </Link>
                <Link href="/dashboard" className="btn-ghost">
                  <LayoutDashboard className="mr-1.5 h-4 w-4" />
                  Dashboard
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <NotificationBell />
              <UserMenu user={user} />
            </>
          ) : (
            <a href="/api/auth/login" className="btn-primary">
              Sign in
            </a>
          )}
        </div>
      </nav>
    </header>
  );
}

function UserMenu({ user }: { user: NavUser }) {
  return (
    <div className="group relative">
      <button className="flex items-center rounded-full">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName ?? "User"}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
            {(user.displayName ?? "U")[0].toUpperCase()}
          </div>
        )}
      </button>
      <div className="invisible absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg opacity-0 transition-all group-hover:visible group-hover:opacity-100">
        <Link
          href="/settings"
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <a
          href="/api/auth/logout"
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </a>
      </div>
    </div>
  );
}
