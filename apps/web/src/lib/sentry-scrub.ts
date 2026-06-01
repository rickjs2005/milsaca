// Scrub de PII pra eventos do Sentry (LGPD), compartilhado pelos 3 configs
// (server / edge / browser). Reusa `redact` do logger — redação recursiva por
// token de chave + scrub de PII embutida em strings (email/CPF/CNPJ/telefone).
//
// Runtime-agnóstico: importa só `@/lib/logger` (que NÃO é server-only),
// então pode rodar em Node, Edge e no browser (instrumentation-client).
import type { Breadcrumb, Event } from "@sentry/nextjs";

import { redact } from "@/lib/logger";

// `redact` devolve `unknown`; helpers tipados pra encaixar nos campos do Event
// sem espalhar casts pelo corpo do scrub.
function redactString(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return redact(value) as string;
}

function redactRecord(
  value: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  return redact(value) as Record<string, unknown>;
}

/**
 * Mascara PII em todo o evento antes de enviar pro Sentry. Cobre message,
 * exceptions, user, extra, contexts, request (cookies/headers/data/query) e
 * breadcrumbs. Muta e devolve o próprio `event` (assinatura de `beforeSend`).
 */
export function scrubEvent<E extends Event>(event: E): E {
  if (event.message) {
    event.message = redactString(event.message) ?? event.message;
  }

  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (ex.value) ex.value = redactString(ex.value) ?? ex.value;
    }
  }

  // Mantém só `id`: email/username/ip e quaisquer extras são PII.
  if (event.user) {
    const id = event.user.id;
    event.user = id !== undefined ? { id } : {};
  }

  if (event.extra) {
    event.extra = redactRecord(event.extra) ?? event.extra;
  }

  if (event.contexts) {
    event.contexts = redactRecord(event.contexts) as Event["contexts"];
  }

  if (event.request) {
    const req = event.request;
    if (req.cookies) {
      req.cookies = redact(req.cookies) as typeof req.cookies;
    }
    if (req.headers) {
      req.headers = redactRecord(req.headers) as typeof req.headers;
    }
    if (req.data !== undefined) {
      req.data = redact(req.data);
    }
    if (req.query_string) {
      req.query_string = redact(req.query_string) as typeof req.query_string;
    }
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb: Breadcrumb) => {
      if (crumb.message) {
        crumb.message = redactString(crumb.message) ?? crumb.message;
      }
      if (crumb.data) {
        crumb.data = redactRecord(crumb.data) ?? crumb.data;
      }
      return crumb;
    });
  }

  return event;
}
