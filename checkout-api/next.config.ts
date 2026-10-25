import type { NextConfig } from "next";

// Whop Elements loads its SDK and frames from cdn.whop.com and calls the Whop
// API from our page (sandbox-api.whop.com while testing), so those hosts are
// added here, as the article's "Put the checkout on our page" section says.
// contentSecurityPolicy() from @whop/elements returns the full list, including
// wallet hosts this demo does not need.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.whop.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.whop.com",
  "font-src 'self'",
  "frame-src https://cdn.whop.com https://*.whop.com",
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
