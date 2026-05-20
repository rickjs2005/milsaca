import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Milsaca — Corretagem de café",
    template: "%s · Milsaca",
  },
  description:
    "Corretagem de café que conecta produtor, corretora e mercado.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
};

export const viewport: Viewport = {
  themeColor: "#2D3A2E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen bg-milsaca-cream font-sans text-milsaca-verde">
        {children}
        {/* Toaster global — montar uma única vez pro app inteiro. */}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
