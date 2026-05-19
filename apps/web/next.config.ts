import type { NextConfig } from "next";

/**
 * Content Security Policy do Milsaca.
 *
 * Permite:
 *   - próprio domínio (default)
 *   - Supabase API (auth + REST + Realtime ws)
 *   - OpenStreetMap tiles (Leaflet)
 *   - IBGE (autocomplete de cidades)
 *   - unpkg (Leaflet marker icons via URL absoluta)
 *   - Google Fonts (next/font carrega via CSS @font-face)
 *   - wa.me (WhatsApp redirect via form-action)
 *
 * 'unsafe-inline' em style-src é necessário pra Tailwind/Next runtime;
 * mover pra hash-based CSP fica como dívida.
 *
 * 'unsafe-eval' em script-src ainda é necessário pra Next dev/turbo.
 */
function buildCspHeader(): string {
  const supabaseHost =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, "") ?? "";
  const supabaseHttps = supabaseHost ? `https://${supabaseHost}` : "";
  const supabaseWss = supabaseHost ? `wss://${supabaseHost}` : "";

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https:",
      "https://*.tile.openstreetmap.org",
      "https://unpkg.com",
    ],
    "connect-src": [
      "'self'",
      supabaseHttps,
      supabaseWss,
      "https://servicodados.ibge.gov.br",
      "https://api.ibge.gov.br",
    ].filter(Boolean),
    "frame-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'", "https://wa.me"],
    "frame-ancestors": ["'none'"],
    "upgrade-insecure-requests": [],
  };

  return Object.entries(directives)
    .map(([k, v]) => (v.length > 0 ? `${k} ${v.join(" ")}` : k))
    .join("; ");
}

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  transpilePackages: [
    "@milsaca/ui",
    "@milsaca/db",
    "@milsaca/types",
    "@milsaca/config-tailwind",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: buildCspHeader() },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default config;
