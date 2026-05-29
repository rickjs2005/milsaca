// Sentry — runtime Edge (middleware e route handlers com runtime "edge").
// Carregado por `instrumentation.ts` via register() quando NEXT_RUNTIME==="edge".
// Não envia PII por padrão (LGPD); beforeSend mascara email no usuário/mensagem.
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
