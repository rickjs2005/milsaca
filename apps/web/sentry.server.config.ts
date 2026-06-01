// Sentry — runtime Node.js (server components, route handlers, server actions).
// Carregado por `instrumentation.ts` via register() quando NEXT_RUNTIME==="nodejs".
// Não envia PII por padrão (LGPD); beforeSend faz scrub completo do evento
// (mensagem, exceções, user, extra, contexts, request e breadcrumbs).
import * as Sentry from "@sentry/nextjs";

import { scrubEvent } from "@/lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  // Só ativa de fato em produção e quando há DSN provisionado.
  enabled: Boolean(dsn) && process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend(event) {
    return scrubEvent(event);
  },
});
