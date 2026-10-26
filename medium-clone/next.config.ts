import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
    // create-next-app adds this rule so Tailwind CSS gets compiled. Keep it.
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "assets.whop.com" },
      { protocol: "https", hostname: "cdn.whop.com" },
      // Whop returns a generated avatar from ui-avatars.com when the user has
      // no profile photo set. The URL comes from the OIDC `picture` claim.
      { protocol: "https", hostname: "ui-avatars.com" },
    ],
  },
};

export default nextConfig;
