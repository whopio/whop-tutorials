import type { NextConfig } from "next";
import { withWhopAppConfig } from "@whop/react/next.config";

const csp = [
  "frame-src https://*.whop.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.whop.com https://sandbox-js.whop.com https://cdn.plaid.com",
  "connect-src 'self' https://api.whop.com https://sandbox-api.whop.com https://*.whop.com",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.whop.com" },
      { protocol: "https", hostname: "cdn.whop.com" },
    ],
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

export default withWhopAppConfig(nextConfig);
