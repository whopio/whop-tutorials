import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { WhopApp } from "@whop/react/components";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cuppa — get paid by the people who love your work",
  description:
    "Cuppa is where fans back the creators they love with tips, memberships, and shop purchases. Built with Next.js and Whop.",
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <WhopApp accentColor="blue" grayColor="sand" appearance="inherit" hasBackground={false}>
          {children}
        </WhopApp>
      </body>
    </html>
  );
}
