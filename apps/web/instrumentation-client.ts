// Sentry — runtime do browser. Em @sentry/nextjs >=9 / Next 15+ este arquivo
// substitui o antigo sentry.client.config.ts e é carregado automaticamente.
// Não envia PII por padrão (LGPD); beforeSend faz scrub completo do evento
// (mensagem, exceções, user, extra, contexts, request e breadcrumbs).
// `scrubEvent`/`redact` são runtime-agnósticos — seguros no browser.
import * as Sentry from "@sentry/nextjs";

import { scrubEvent } from "@/lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn) && process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
  // Replay desligado por padrão (custo + privacidade); ligar quando necessário.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
  beforeSend(event) {
    return scrubEvent(event);
  },
});

// Necessário pra instrumentar navegações no App Router (Next 15+).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
