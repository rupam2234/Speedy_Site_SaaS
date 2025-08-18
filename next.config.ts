import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // allow all HTTPS domains
      },
    ],
  },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
