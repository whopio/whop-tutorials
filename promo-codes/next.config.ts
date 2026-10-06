import type { NextConfig } from "next";
import { withWhopAppConfig } from "@whop/react/next.config";

const csp = [
  // The checkout itself renders in a Whop frame. Plaid Link, which the embed
  // opens for bank payments, mounts its own frame on this page.
  "frame-src https://*.whop.com https://cdn.plaid.com",
  // The embed ships in our own bundle via @whop/checkout, so no Whop script
  // host is required for it. js.whop.com stays listed for the script-tag
  // integration, and it is the same host in sandbox and production. The embed
  // injects Plaid Link's loader into this page, so cdn.plaid.com is allowed.
  // The card fields stay inside the Whop frame, which this policy does not
  // govern.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.whop.com https://cdn.plaid.com",
  "connect-src 'self' https://api.whop.com https://sandbox-api.whop.com https://*.whop.com https://*.plaid.com",
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
