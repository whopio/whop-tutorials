import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Sidebar } from "@/components/sidebar";
import { requireAuth, getCreatorProfile } from "@/lib/auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Courstar",
  description: "Learn from the best creators on the internet",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth({ redirect: false });
  const creatorProfile = user ? await getCreatorProfile(user.id) : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="flex h-screen overflow-hidden">
            <Sidebar
              user={
                user
                  ? { id: user.id, name: user.name, avatarUrl: user.avatarUrl }
                  : null
              }
              isInstructor={!!creatorProfile?.kycComplete}
            />
            <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
