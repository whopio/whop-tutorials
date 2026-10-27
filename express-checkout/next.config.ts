import type { NextConfig } from "next";
import { contentSecurityPolicy } from "@whop/elements";
import { withWhopAppConfig } from "@whop/react/next.config";

// Our own sources, then the hosts Whop Elements needs (its frames and SDK,
// the Whop API, and the wallet and bank providers) merged in for the
// environment the demo runs against.
const csp = contentSecurityPolicy({
  environment: process.env.WHOP_SANDBOX === "true" ? "sandbox" : "production",
}).merge(
  [
    "frame-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "connect-src 'self'",
    "img-src 'self' data: https:",
  ].join("; "),
);

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
