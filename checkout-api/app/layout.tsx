import type { Metadata, Viewport } from "next";
import { Theme } from "@whop/react/components";
import "./globals.css";

export const metadata: Metadata = {
  title: "Checkout API breakdown",
  description:
    "Tag a checkout with your own order number, pay for it without leaving the page, and watch that number come back on the payment. Companion demo for the article on integrating Whop's checkout API.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Deliberately light-themed: the `light` class on <html> carries the
    // Frosted theme and Theme inherits it. Theme directly rather than
    // WhopApp, because WhopApp injects a script that overwrites the class
    // with the system preference.
    <html
      lang="en"
      className="h-full light"
      style={{ colorScheme: "light" }}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <Theme appearance="inherit">{children}</Theme>
      </body>
    </html>
  );
}
