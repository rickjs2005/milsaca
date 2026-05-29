// Next.js instrumentation hook. Carrega o config de Sentry correto por runtime
// (Node.js vs Edge) e expõe onRequestError pra capturar erros de
// server components / route handlers automaticamente (@sentry/nextjs >=8).
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
