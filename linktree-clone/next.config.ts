import type { NextConfig } from "next";

const isSandbox = process.env.NEXT_PUBLIC_WHOP_ENV === "sandbox";

// Whop's embedded components and hosted checkout pages need explicit allowance
// in the Content-Security-Policy. Sandbox traffic loads from the sandbox host
// equivalents.
const whopFrame = isSandbox
  ? "https://*.whop.com https://sandbox-js.whop.com"
  : "https://*.whop.com";
const whopScript = isSandbox
  ? "https://js.whop.com https://sandbox-js.whop.com"
  : "https://js.whop.com";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${whopScript}`,
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
