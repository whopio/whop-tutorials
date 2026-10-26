import type { Metadata, Viewport } from "next";
import { Theme } from "@whop/react/components";
import "./globals.css";

export const metadata: Metadata = {
  title: "Subscription billing breakdown",
  description:
    "Sign in with Whop, subscribe to a monthly Pro plan in an embedded checkout, open the Pro area, and pause or cancel on your own. Companion demo for the subscription billing app tutorial.",
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
    // Light on purpose, like the sibling demos. The `light` class carries the Frosted
    // theme and Theme inherits it.
    <html lang="en" className="h-full light" style={{ colorScheme: "light" }} suppressHydrationWarning>
      <body className="min-h-full">
        <Theme appearance="inherit">{children}</Theme>
      </body>
    </html>
  );
}
