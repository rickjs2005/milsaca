import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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
 *
 * 'unsafe-inline' em style-src é necessário pra Tailwind/Next runtime;
 * mover pra hash-based CSP fica como dívida.
 *
 * 'unsafe-eval' em script-src é injetado SÓ em dev (necessário pro Next
 * Turbo). Prod fecha — qualquer eval em prod indica ou dependência
 * insegura ou ataque.
 *
 * form-action: removida diretiva pra wa.me — wa.me é anchor href,
 * nunca destino de form submit. Manter só 'self'.
 */
function buildCspHeader(isDev: boolean): string {
  const supabaseHost =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, "") ?? "";
  const supabaseHttps = supabaseHost ? `https://${supabaseHost}` : "";
  const supabaseWss = supabaseHost ? `wss://${supabaseHost}` : "";

  const scriptSrc = ["'self'", "'unsafe-inline'"];
  if (isDev) scriptSrc.push("'unsafe-eval'");

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
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
      // Sentry (ingest de erros/traces). *.ingest.sentry.io cobre o endpoint
      // regional do DSN; *.sentry.io cobre tunneling/CDN auxiliar.
      "https://*.sentry.io",
      "https://*.ingest.sentry.io",
    ].filter(Boolean),
    "frame-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
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
          {
            key: "Content-Security-Policy",
            value: buildCspHeader(process.env.NODE_ENV !== "production"),
          },
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

// withSentryConfig envolve o config preservando headers()/CSP acima.
// org/project ficam configuráveis por env pra não acoplar ao slug da conta;
// SENTRY_AUTH_TOKEN (build-time) habilita upload de sourcemaps no CI/Vercel.
export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT ?? "milsaca-web",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Sourcemaps: oculta os sources do bundle cliente após upload (privacidade).
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  // Evita custo/efeitos colaterais quando não há token (dev/local).
  disableLogger: true,
  telemetry: false,
});
