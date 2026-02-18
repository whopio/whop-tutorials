import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Swaphause",
  description:
    "The live marketplace for sneakers, streetwear, electronics, collectibles, and more. Buy and sell with real-time pricing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans`}>
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <footer className="border-t border-gray-800 py-8 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-500">
                Swaphause — Built with Whop
              </p>
              <div className="flex gap-6 text-sm text-gray-500">
                <a href="/products" className="hover:text-gray-300 transition-colors">
                  Browse
                </a>
                <a href="/dashboard" className="hover:text-gray-300 transition-colors">
                  Dashboard
                </a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
