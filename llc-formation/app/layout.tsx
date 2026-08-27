import type { Metadata, Viewport } from "next";
import { Theme } from "@whop/react/components";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLC formation breakdown",
  description:
    "Register an LLC or C-Corp for one of your platform's users with a single API call. Companion demo for the LLC formation API guide.",
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
