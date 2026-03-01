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
  
  // Разрешаем запросы из preview iframe
  allowedDevOrigins: [
    'preview-chat-5116e83a-e55b-473a-8cbd-c54c5e1fa020.space.z.ai',
    '.space.z.ai',
    'localhost',
  ],
};

export default nextConfig;
