import type { NextConfig } from "next";

// Whop's embedded components load from apollo.elements.whop.com. It has to be
// allowed in script-src, frame-src and connect-src or the element renders as a
// blank box with nothing but a CSP violation in the console to explain it.
// There is no sandbox-specific script host. sandbox.whop.com is already covered
// by https://*.whop.com.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.whop.com https://apollo.elements.whop.com https://t.whop.tw",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.whop.com",
  "font-src 'self'",
  "frame-src https://*.whop.com https://apollo.elements.whop.com",
  "connect-src 'self' https://*.whop.com https://apollo.elements.whop.com https://t.whop.tw",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
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
