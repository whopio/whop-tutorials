import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-[var(--color-border)] bg-[var(--color-surface)]/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 max-w-sm sm:col-span-1">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Templates for every tool. One marketplace, every format.
            </p>
          </div>

          {/* Browse */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-text-secondary)]">
              Browse
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/templates"
                  className="text-[var(--color-text-primary)] transition hover:text-[var(--color-accent)]"
                >
                  All templates
                </Link>
              </li>
              <li>
                <Link
                  href="/#tools"
                  className="text-[var(--color-text-primary)] transition hover:text-[var(--color-accent)]"
                >
                  By tool
                </Link>
              </li>
            </ul>
          </div>

          {/* Sell */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-text-secondary)]">
              Sell
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/sell"
                  className="text-[var(--color-text-primary)] transition hover:text-[var(--color-accent)]"
                >
                  Become a seller
                </Link>
              </li>
              <li>
                <Link
                  href="/sell/dashboard"
                  className="text-[var(--color-text-primary)] transition hover:text-[var(--color-accent)]"
                >
                  Seller dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-text-secondary)]">
              About
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href="https://whop.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-text-primary)] transition hover:text-[var(--color-accent)]"
                >
                  Whop
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Stax</span>
          <span>
            Powered by{" "}
            <a
              href="https://whop.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--color-text-primary)] underline-offset-4 hover:underline"
            >
              Whop
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
