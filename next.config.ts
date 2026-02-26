import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,

  // Экспериментальные настройки для стабильности
  experimental: {
    // Отключаем оптимизацию, которая может вызывать перезапуски
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

export default nextConfig;
