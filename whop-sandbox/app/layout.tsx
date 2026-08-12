import type { Metadata, Viewport } from "next";
import { Theme } from "@whop/react/components";
import "./globals.css";

export const metadata: Metadata = {
  title: "Whop sandbox breakdown",
  description:
    "Pay with test cards, break a payment on purpose, refund it, and watch Whop react live. Companion demo for the article on the Whop sandbox.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The demo is deliberately light-themed: the `light` class on <html>
    // carries the Frosted theme, and Theme inherits it. We use Theme
    // directly instead of WhopApp because WhopApp injects a theme script
    // that overwrites the class with the system preference.
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
