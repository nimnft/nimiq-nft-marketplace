import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "*.picsum.photos",
      },
    ],
  },
  devIndicators: false,
  serverExternalPackages: ["@nimiq/hub-api"],
};

export default nextConfig;
