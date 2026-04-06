import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "utfs.io" },
      { hostname: "assets.whop.com" },
      { hostname: "cdn.whop.com" },
    ],
  },
};

export default nextConfig;
