import type { NextConfig } from "next";
import { withWhopAppConfig } from "@whop/react/next.config";

const csp = [
  "frame-src https://*.whop.com",
  // The embed ships in our own bundle via @whop/checkout, so no Whop script
  // host is required here. js.whop.com stays listed for the script-tag
  // integration, and it is the same host in sandbox and production. Plaid and
  // the card fields load inside the sandbox.whop.com frame, which this policy
  // does not govern, so they need no entry here.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.whop.com",
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
