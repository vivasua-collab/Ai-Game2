import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  fallback: ["system-ui", "sans-serif"],
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  fallback: ["monospace", "Courier New"],
  adjustFontFallback: true,
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
