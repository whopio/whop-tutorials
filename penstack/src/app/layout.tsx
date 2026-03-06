import type { Metadata, Viewport } from "next";
import { requireAuth } from "@/lib/auth";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Penstack",
  description: "A publishing platform for independent writers",
  openGraph: {
    title: "Penstack",
    description: "A publishing platform for independent writers",
    siteName: "Penstack",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth({ redirect: false });

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Nav user={user} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
