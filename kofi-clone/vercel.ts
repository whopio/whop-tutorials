import type { VercelConfig } from "@vercel/config/v1";

// Vercel project configuration (typed, replaces vercel.json).
// The Content-Security-Policy that allows the Whop embedded checkout + payout
// iframes is applied in next.config.ts headers() so it works in dev and prod alike.
export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "npm run build",
};
