import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// CSP: migrada pro middleware (nonce por request — P1 da auditoria 2026-06-12).
// Os demais security headers continuam aqui.

// Host do Supabase pra next/image otimizar imagens do Storage (fotos da
// Comunidade, logos). Derivado do env pra não acoplar ao ref do projeto.
const supabaseImageHost =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, "") ?? "";

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  images: {
    remotePatterns: supabaseImageHost
      ? [
          {
            protocol: "https",
            hostname: supabaseImageHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
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
