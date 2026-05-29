// Sentry — runtime do browser. Em @sentry/nextjs >=9 / Next 15+ este arquivo
// substitui o antigo sentry.client.config.ts e é carregado automaticamente.
// Não envia PII por padrão (LGPD); beforeSend mascara email.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
function maskEmails(input: string): string {
  return input.replace(EMAIL_RE, "***@$1");
}

Sentry.init({
  dsn,
  enabled: Boolean(dsn) && process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
  // Replay desligado por padrão (custo + privacidade); ligar quando necessário.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.user?.email) {
      event.user.email = maskEmails(event.user.email);
    }
    if (event.message) {
      event.message = maskEmails(event.message);
    }
    if (event.exception?.values) {
      for (const ex of event.exception.values) {
        if (ex.value) ex.value = maskEmails(ex.value);
      }
    }
    return event;
  },
});

// Necessário pra instrumentar navegações no App Router (Next 15+).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
