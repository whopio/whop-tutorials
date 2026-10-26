import type { Metadata, Viewport } from "next";
import { Theme } from "@whop/react/components";
import "./globals.css";

export const metadata: Metadata = {
  title: "Global payouts breakdown",
  description:
    "Create an account for a seller in another country, let them prove who they are and pick how they want to be paid, then send them their money and follow it until it lands. Companion demo for the global payouts API guide.",
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
