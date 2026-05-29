// Sentry — runtime Node.js (server components, route handlers, server actions).
// Carregado por `instrumentation.ts` via register() quando NEXT_RUNTIME==="nodejs".
// Não envia PII por padrão (LGPD); beforeSend mascara email no usuário/mensagem.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Mascara emails (LGPD): "joao@x.com" -> "***@x.com". Aplica em user.email,
// na mensagem do evento e nos valores de exceção. Mantém domínio pra triagem.
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
function maskEmails(input: string): string {
  return input.replace(EMAIL_RE, "***@$1");
}

Sentry.init({
  dsn,
  // Só ativa de fato em produção e quando há DSN provisionado.
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
