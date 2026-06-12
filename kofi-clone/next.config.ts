import type { NextConfig } from "next";

// Content Security Policy that allows the Whop embedded checkout + payout/elements
// iframes and scripts, while keeping everything else same-origin. 'unsafe-inline'
// and 'unsafe-eval' are required for Next.js (and Turbopack HMR in dev).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.whop.com https://*.whop.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "frame-src https://*.whop.com",
  "connect-src 'self' https://*.whop.com wss://*.whop.com",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: csp }],
      },
    ];
  },
};

export default nextConfig;
