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
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#2D3A2E",
  width: "device-width",
  initialScale: 1,
};

/**
 * Aplica o tema ANTES da hidratação (anti-flash). Roda como script inline
 * bloqueante no <head>. Default sem escolha salva = CLARO (não segue o
 * sistema sozinho — o usuário opta por Escuro/Sistema no ThemeToggle).
 * Chave localStorage: `mp_theme` ∈ light | dark | system.
 */
const THEME_INIT = `(function(){try{var t=localStorage.getItem("mp_theme");var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      {/* bg/text semânticos (idênticos a cream/verde no claro) pro tema trocar junto */}
      <body className="min-h-screen bg-background font-sans text-foreground">
        {children}
        {/* Toaster global — montar uma única vez pro app inteiro. */}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
