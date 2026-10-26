import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // create-next-app adds this rule so Tailwind CSS gets compiled. Keep it.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      { hostname: "utfs.io" },
      { hostname: "assets.whop.com" },
      { hostname: "cdn.whop.com" },
    ],
  },
};

export default nextConfig;
