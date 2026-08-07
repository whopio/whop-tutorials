import type { NextConfig } from "next";

// The checkout runs in an iframe from Whop and Whop's attribution script runs
// on our page, so both have to be allowed.
// There is no sandbox-specific script host. sandbox.whop.com is already
// covered by https://*.whop.com in frame-src.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://t.whop.tw",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.whop.com",
  "font-src 'self'",
  "frame-src https://*.whop.com",
  "connect-src 'self' https://api.whop.com https://sandbox-api.whop.com https://*.whop.com",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
