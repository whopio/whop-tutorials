// Vercel configuration (vercel.ts over vercel.json)
// When Vercel ships their TypeScript config SDK, replace this with:
//   import { defineConfig } from "@vercel/config";

const config = {
  framework: "nextjs" as const,
  buildCommand: "prisma generate && next build",
  regions: ["iad1"],
  headers: [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
      ],
    },
  ],
};

export default config;
