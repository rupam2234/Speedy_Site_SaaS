import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    domains: ["tmpvygehhshrgsqxzaty.supabase.co"],
  },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
