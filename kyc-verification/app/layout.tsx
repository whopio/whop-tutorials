import type { Metadata, Viewport } from "next";
import { Theme } from "@whop/react/components";
import "./globals.css";

export const metadata: Metadata = {
  title: "Identity verification breakdown",
  description:
    "Start an identity check for one person, send them to the screen Whop draws, hear the result on a webhook, and read the verified name, date of birth and address back. Companion demo for the KYC verification API guide.",
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
