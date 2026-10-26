import type { NextConfig } from "next";

// 'unsafe-eval' is only needed for the dev bundler's HMR. Keep it out of the
// production CSP so it can't be abused there.
const isDev = process.env.NODE_ENV !== "production";

// Whop's embedded components and hosted checkout pages need explicit allowance
// in the Content-Security-Policy. The same hosts serve sandbox and production.
const whopFrame = "https://*.whop.com";
const whopScript = "https://js.whop.com";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}${whopScript} https://*.elements.whop.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.whop.com https://sandbox-api.whop.com",
  `frame-src ${whopFrame}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
