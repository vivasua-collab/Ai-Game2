import type { NextConfig } from "next";

// Next.js 16 + Turbopack config - Updated: 2024-03-17
const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: {
    appIsrStatus: true,
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  serverExternalPackages: ['phaser'],
  turbopack: {},
};

export default nextConfig;
