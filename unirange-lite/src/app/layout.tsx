import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "UniRange-Lite | Uniswap LP Calculator",
  description: "Calculate Uniswap V3/V4 liquidity position APR, APY, and projected revenues across Ethereum, Arbitrum, Optimism, and Base",
  keywords: ["Uniswap", "DeFi", "Liquidity", "APR", "APY", "Calculator", "V3", "V4"],
  authors: [{ name: "UniRange-Lite" }],
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
