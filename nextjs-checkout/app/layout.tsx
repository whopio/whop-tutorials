import type { Metadata } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Checkout demo — Next.js + Whop",
  description:
    "Reference companion for the article 'How to add checkout to a Next.js SaaS app'.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable}`}>
      <body className="min-h-dvh flex flex-col bg-[color:var(--color-bg)]">
        <header className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="font-serif text-[18px] tracking-tight text-[color:var(--color-fg-primary)]"
            >
              checkout demo
            </Link>
            <div className="text-sm text-[color:var(--color-fg-muted)] flex items-center gap-4">
              {user ? (
                <>
                  <span className="hidden sm:inline">{user.email}</span>
                  <form action="/api/auth/logout" method="POST">
                    <button
                      type="submit"
                      className="underline hover:text-[color:var(--color-fg-primary)] transition-colors"
                    >
                      sign out
                    </button>
                  </form>
                </>
              ) : (
                <span>not signed in</span>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 pb-20">{children}</main>
        <footer
          className="sticky bottom-0 left-0 right-0 border-t border-[color:var(--color-border)] bg-[color:var(--color-bg)]/95 backdrop-blur-sm py-3 z-40"
          style={{ boxShadow: "var(--shadow-footer)" }}
        >
          <div className="max-w-5xl mx-auto px-6 text-xs text-[color:var(--color-fg-muted)] flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <span>
              companion for{" "}
              <em className="not-italic font-medium">
                How to add checkout to a Next.js SaaS app
              </em>
            </span>
            <a
              href="https://github.com/whopio/whop-tutorials/tree/main/nextjs-checkout"
              className="underline hover:text-[color:var(--color-fg-primary)] transition-colors"
            >
              source
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
