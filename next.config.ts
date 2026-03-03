import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Отключаем DevTools в левом нижнем углу - вызывает ре-рендеры сцены
  devIndicators: false,
};

export default nextConfig;
