import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Whop Chrome Extension Starter",
  description:
    "A Manifest V3 Chrome extension starter with Whop OAuth, checkout, billing, and premium entitlement checks."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true" />
            <span>Whop Extension Starter</span>
          </Link>
          <nav aria-label="Primary navigation">
            <Link href="/checkout">Checkout</Link>
            <Link href="/docs">Docs</Link>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <span>Whop gated Chrome extension starter</span>
          <Link href="/api/health">API health</Link>
        </footer>
      </body>
    </html>
  );
}
