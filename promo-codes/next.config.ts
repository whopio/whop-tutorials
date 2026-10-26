import type { NextConfig } from "next";
import { contentSecurityPolicy } from "@whop/elements";
import { withWhopAppConfig } from "@whop/react/next.config";

// Elements loads its script from cdn.whop.com, renders the checkout in frames
// from the same host, and talks to the Whop API for the environment it runs
// against. The helper knows those hosts, plus the wallet providers the
// checkout can offer, and adds them to our own policy. The card fields stay
// inside Whop's frames, which this policy does not govern. 'unsafe-eval' is
// for React's development build.
const csp = contentSecurityPolicy({
  environment: process.env.WHOP_SANDBOX?.trim() === "true" ? "sandbox" : "production",
}).merge(
  [
    "frame-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "connect-src 'self'",
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
