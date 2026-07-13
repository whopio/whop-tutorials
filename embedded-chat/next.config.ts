import type { NextConfig } from "next";
import { withWhopAppConfig } from "@whop/react/next.config";

// Embedded chat renders inside a Whop iframe, loads its runtime from
// *.elements.whop.com, and keeps a realtime WebSocket open. The elements
// host and the wss origins are the additions over the checkout demos.
// These are validated in-browser (the docs do not publish a canonical
// allowlist); tighten only if the console reports a blocked origin.
const csp = [
  "frame-src https://*.whop.com https://*.elements.whop.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.whop.com https://sandbox-js.whop.com https://*.elements.whop.com",
  "connect-src 'self' https://api.whop.com https://sandbox-api.whop.com https://*.whop.com https://*.elements.whop.com wss://*.whop.com wss://*.elements.whop.com",
  "img-src 'self' https://*.whop.com https://cdn.whop.com data: blob:",
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
