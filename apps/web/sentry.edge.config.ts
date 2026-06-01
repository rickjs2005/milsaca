// Sentry — runtime Edge (middleware e route handlers com runtime "edge").
// Carregado por `instrumentation.ts` via register() quando NEXT_RUNTIME==="edge".
// Não envia PII por padrão (LGPD); beforeSend faz scrub completo do evento
// (mensagem, exceções, user, extra, contexts, request e breadcrumbs).
import * as Sentry from "@sentry/nextjs";

import { scrubEvent } from "@/lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn) && process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend(event) {
    return scrubEvent(event);
  },
});
