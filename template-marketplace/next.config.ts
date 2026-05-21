import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // next/image must opt in to every external image host. UploadThing serves
  // both the modern per-app subdomain (`<appId>.ufs.sh`) and the legacy
  // shared `utfs.io` host; allow both so user-uploaded thumbnails and
  // downloadable previews are routed through the Vercel image optimizer.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.ufs.sh" },
      { protocol: "https", hostname: "utfs.io" },
    ],
  },
};

export default nextConfig;
