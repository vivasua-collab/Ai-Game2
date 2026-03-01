import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Системные шрифты вместо Google Fonts
// Это обеспечивает:
// 1. Сборку без внешних зависимостей
// 2. Работу в оффлайн-режиме
// 3. Быструю загрузку (нет сетевых запросов)

export const metadata: Metadata = {
  title: "🌸 Cultivation World Simulator",
  description: "Immersive text-based cultivation game with AI-powered storytelling. Progress through cultivation realms, master techniques, and explore a rich fantasy world.",
  keywords: ["cultivation", "game", "xianxia", "text adventure", "AI game", "cultivation simulator"],
  authors: [{ name: "Cultivation World Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Cultivation World Simulator",
    description: "AI-powered cultivation adventure game",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cultivation World Simulator",
    description: "AI-powered cultivation adventure game",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
