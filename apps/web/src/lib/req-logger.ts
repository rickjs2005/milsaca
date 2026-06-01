// Helper server-only: logger já vinculado ao `reqId` da requisição.
//
// SEPARADO de `logger.ts` de propósito — este importa `next/headers`
// (server-only), então não pode ser puxado por client/edge. Use em Server
// Actions e Route Handlers (runtime Node):
//
//   const log = await getReqLogger({ action: "createPagamento", corretoraId });
//   log.error("pagamento_insert_falhou", { code, err: safeError(error) });

import "server-only";
import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { logger, type Logger, type LogFields } from "@/lib/logger";

/**
 * Marca o `reqId` como tag no Sentry pra cruzar log estruturado ↔ evento.
 * Confia no isolation scope por request do Next/Sentry (cada request tem seu
 * próprio scope, então a tag não vaza entre requisições). Envolto em try/catch
 * pra nunca quebrar a action caso o Sentry não esteja ativo/inicializado.
 */
export function tagSentryReqId(reqId?: string): void {
  if (!reqId) return;
  try {
    Sentry.setTag("reqId", reqId);
  } catch {
    // Sentry inativo/não inicializado — segue sem tag.
  }
}

export async function getReqLogger(bindings: LogFields = {}): Promise<Logger> {
  let reqId: string | undefined;
  try {
    reqId = (await headers()).get("x-request-id") ?? undefined;
  } catch {
    // Fora de escopo de request (ex.: build) — segue sem reqId.
  }
  // Correlaciona o reqId do log estruturado com o evento no Sentry.
  tagSentryReqId(reqId);
  return logger.child({ ...(reqId ? { reqId } : {}), ...bindings });
}
