import type { NextConfig } from "next";

// Single-line CSP. Permissive where the app legitimately needs it — the inline
// no-flash theme script + Next/Turbopack ('unsafe-inline'/'unsafe-eval'); images
// and video from many hosts incl. Vercel Blob, Whop media, and the seed CDNs
// (https:); the embedded Whop checkout/payout (frames + scripts from *.whop.com);
// HMR websockets (ws:/wss:) — while still pinning frame-ancestors (clickjacking),
// object-src, base-uri, and blocking non-https schemes. Production hardening can
// tighten script-src with a nonce and narrow the image/connect allow-lists.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.whop.com https://whop.com",
  "frame-src 'self' https://*.whop.com https://whop.com",
  "connect-src 'self' https: wss: ws:",
  "form-action 'self' https://*.whop.com https://whop.com",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Pin the workspace root to this app so Next doesn't infer a parent
  // directory from stray lockfiles higher up the tree.
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
