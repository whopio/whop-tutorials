import type { Metadata, Viewport } from "next";
import { Theme } from "@whop/react/components";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbit - Whop embedded chat demo",
  description:
    "Live embedded Whop chat: channels, direct messages, and support chats with moderation, theming, and realtime events, all on Whop's sandbox. Companion demo for the article on adding embedded chats with Whop.",
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
