import { routes, type VercelConfig } from "@vercel/config/v1";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.whop.com https://sandbox-js.whop.com https://uploadthing.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://utfs.io https://assets.whop.com https://cdn.whop.com https://ui-avatars.com",
  "connect-src 'self' https://*.whop.com https://*.uploadthing.com https://*.utfs.io",
  "frame-src 'self' https://*.whop.com",
].join("; ");

export const config: VercelConfig = {
  buildCommand: "prisma generate && next build",
  framework: "nextjs",
  crons: [
    { path: "/api/cron/partner-payout", schedule: "0 0 1 * *" },
  ],
  headers: [
    routes.header("/(.*)", [
      { key: "Content-Security-Policy", value: CSP },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ]),
  ],
};
