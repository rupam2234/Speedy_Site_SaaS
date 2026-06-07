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
  allowedDevOrigins: ["*.ngrok-free.dev"] // for stripe webhook tests
};

export default nextConfig;
