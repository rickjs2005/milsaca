// Logger estruturado (JSON em uma linha) pro web.
//
// Objetivo: logs parseáveis pela Vercel/observabilidade com correlação por
// `reqId` (ver middleware → header `x-request-id`). NÃO logar PII
// (email, CPF/CNPJ, telefone, nome). Passe só ids e metadados seguros.
//
// Uso:
//   import { logger } from "@/lib/logger";
//   logger.info("contrato_assinado", { reqId, contratoId, corretoraId });
//   logger.error("rpc_falhou", { reqId, rpc: "approve_corretora", code });

type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

interface LogRecord extends LogFields {
  level: LogLevel;
  msg: string;
  ts: string;
  reqId?: string;
}

// Campos cujo nome sugere PII — bloqueados em dev pra pegar vazamento cedo.
// Em prod apenas removidos silenciosamente (defesa em profundidade).
const PII_KEYS = new Set([
  "email",
  "cpf",
  "cnpj",
  "telefone",
  "phone",
  "nome",
  "name",
  "password",
  "senha",
  "token",
  "ip",
]);

function sanitize(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (PII_KEYS.has(k.toLowerCase())) {
      if (process.env.NODE_ENV !== "production") {
        // Ajuda a flagrar uso indevido durante o desenvolvimento.
        out[`${k}_REDACTED`] = "[pii-bloqueado-pelo-logger]";
      }
      continue;
    }
    out[k] = v;
  }
  return out;
}

function emit(level: LogLevel, msg: string, fields: LogFields = {}): void {
  const { reqId, ...rest } = sanitize(fields);
  const record: LogRecord = {
    level,
    msg,
    ts: new Date().toISOString(),
    ...(typeof reqId === "string" ? { reqId } : {}),
    ...rest,
  };
  const line = JSON.stringify(record);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => emit("debug", msg, fields),
  info: (msg: string, fields?: LogFields) => emit("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => emit("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => emit("error", msg, fields),
};

export type { LogLevel, LogFields };
