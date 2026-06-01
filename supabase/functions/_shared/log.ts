// supabase/functions/_shared/log.ts
//
// Logger JSON mínimo pra Edge Functions (runtime Deno). NÃO importar o
// logger do web — runtime e módulos diferentes. Este helper só envolve
// console.* com uma linha JSON estruturada (parseável no Logflare/Sentry).
//
// Uso:
//   import { log, safeError } from "../_shared/log.ts";
//   log.info("sync_done", { runId, collected });
//   log.warn("fetch_retry", { url, attempt });
//   log.error("db_upsert_failed", { runId, err: safeError(e) });
//
// REGRA: sem PII. Estas funções não lidam com email/CPF, mas NUNCA logue
// tokens, secrets, Authorization headers ou bodies de auth.

type Fields = Record<string, unknown>;

interface LogLine extends Fields {
  level: "info" | "warn" | "error";
  msg: string;
  ts: string;
}

function emit(
  level: LogLine["level"],
  sink: (s: string) => void,
  msg: string,
  fields?: Fields,
): void {
  const line: LogLine = {
    level,
    msg,
    ts: new Date().toISOString(),
    ...(fields ?? {}),
  };
  // JSON.stringify numa linha → fácil de parsear nos logs do Supabase.
  sink(JSON.stringify(line));
}

export const log = {
  info: (msg: string, fields?: Fields) =>
    emit("info", console.log, msg, fields),
  warn: (msg: string, fields?: Fields) =>
    emit("warn", console.warn, msg, fields),
  error: (msg: string, fields?: Fields) =>
    emit("error", console.error, msg, fields),
};

// Normaliza um erro desconhecido pra um objeto seguro de logar.
// Inclui stack só fora de produção (DENO_ENV !== "production") pra não
// vazar caminhos internos nos logs de prod.
export function safeError(
  err: unknown,
): { name: string; message: string; code?: string; stack?: string } {
  const includeStack = Deno.env.get("DENO_ENV") !== "production";

  if (err instanceof Error) {
    const out: { name: string; message: string; code?: string; stack?: string } = {
      name: err.name,
      message: err.message,
    };
    // Alguns erros (ex.: PostgrestError, erros de fetch) trazem `code`.
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string" || typeof code === "number") {
      out.code = String(code);
    }
    if (includeStack && err.stack) out.stack = err.stack;
    return out;
  }

  // Erro não-Error (string, objeto, etc.).
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    const code = o.code;
    return {
      name: typeof o.name === "string" ? o.name : "UnknownError",
      message: typeof o.message === "string" ? o.message : String(err),
      ...(typeof code === "string" || typeof code === "number"
        ? { code: String(code) }
        : {}),
    };
  }

  return { name: "UnknownError", message: String(err) };
}
