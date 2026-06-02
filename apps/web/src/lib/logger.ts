// Logger estruturado (JSON em uma linha) pro web.
//
// Objetivo: logs parseáveis pela Vercel/observabilidade com correlação por
// `reqId` (ver middleware → header `x-request-id`) e SEM PII (email, CPF/CNPJ,
// telefone, nome, token, senha) — nem em chaves, nem aninhada, nem na `msg`.
//
// Este arquivo é runtime-agnóstico (Node, Edge e browser) — NÃO importa nada
// server-only. Pra obter um logger já com `reqId` numa Server Action / Route
// Handler, use `getReqLogger()` de `@/lib/req-logger` (que lê `headers()`).
//
// Uso:
//   import { logger } from "@/lib/logger";
//   logger.info("contrato_assinado", { reqId, contratoId, corretoraId });
//   logger.error("rpc_falhou", { reqId, rpc: "approve_corretora", err: safeError(e) });
//   const log = logger.child({ reqId, action: "createPagamento" });
//   log.error("pagamento_insert_falhou", { corretoraId, code });

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

type LogFields = Record<string, unknown>;

interface LogRecord extends LogFields {
  level: LogLevel;
  msg: string;
  ts: string;
}

interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  /** Erro irrecuperável (boot, integridade transacional). Vai pro stream de erro;
   *  o caller normalmente também deve `Sentry.captureException`. */
  fatal(msg: string, fields?: LogFields): void;
  /** Deriva um logger que injeta `bindings` (ex.: reqId/userId/action) em toda linha. */
  child(bindings: LogFields): Logger;
}

// ───────────────────────── Masking de PII ─────────────────────────
// Tokens (palavras) cujo nome de campo indica PII/segredo. A checagem é por
// TOKEN (camelCase/snake_case são quebrados em palavras), não por substring —
// evita falso-positivo tipo "descr-IP-tion" e pega "userEmail"/"access_token".
const PII_TOKENS = new Set([
  "email", "mail", "cpf", "cnpj", "document", "documento", "rg", "pix",
  "phone", "telefone", "tel", "celular", "whatsapp", "cep",
  "password", "senha", "pass", "secret", "token", "authorization", "cookie",
  "session", "apikey", "ip", "name", "nome", "fullname", "firstname",
  "lastname", "sobrenome", "address", "endereco", "bairro",
]);

// Chaves seguras que têm token de PII mas NÃO são PII — vencem a denylist.
const SAFE_KEYS = new Set([
  "reqid", "runid", "action", "code", "kind", "status", "rpc", "level",
  "adaptername", "tablename", "field", "step", "to", "from", "count",
  "corretoraid", "produtorid", "compradorid", "userid", "profileid",
  "loteid", "contratoid", "leadid", "pagamentoid", "entregaid",
  "propostaid", "ofertaid", "dispatchid",
]);

function tokenize(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SAFE_KEYS.has(lower)) return false;
  return tokenize(key).some((t) => PII_TOKENS.has(t));
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const CPF_RE = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const CNPJ_RE = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const PHONE_RE = /\b(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g;

const MAX_STRING = 500;

/** Remove PII embutida numa string livre (msg ou valor de campo não-sensível). */
function scrubString(s: string): string {
  let out = s
    .replace(EMAIL_RE, "[email]")
    .replace(CNPJ_RE, "[cnpj]")
    .replace(CPF_RE, "[cpf]")
    .replace(PHONE_RE, "[tel]");
  if (out.length > MAX_STRING) out = `${out.slice(0, MAX_STRING)}…[+${out.length - MAX_STRING}]`;
  return out;
}

function isPostgrestLike(v: object): boolean {
  return "message" in v && ("code" in v || "details" in v || "hint" in v);
}

/**
 * Serializa um erro pra log com segurança: só `name`/`code`/`message` (com a
 * mensagem passada pelo scrub). NUNCA `details`/`hint` (o Postgres embute valores
 * de linha — ex.: `Key (email)=(...)`) nem `stack` em produção.
 */
export function safeError(err: unknown): LogFields {
  if (err instanceof Error) {
    const out: LogFields = { name: err.name, message: scrubString(err.message) };
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string" || typeof code === "number") out.code = code;
    if (process.env.NODE_ENV !== "production" && err.stack) {
      out.stack = scrubString(err.stack);
    }
    return out;
  }
  if (err && typeof err === "object" && isPostgrestLike(err)) {
    const e = err as { code?: unknown; message?: unknown };
    return {
      ...(e.code != null ? { code: e.code } : {}),
      message: scrubString(String(e.message ?? "")),
    };
  }
  if (typeof err === "string") return { message: scrubString(err) };
  return { message: "[erro-não-serializável]" };
}

const MAX_DEPTH = 4;

/** Redação recursiva: mascara chaves sensíveis, scrub de strings, serializa Error. */
export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return scrubString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Error) return safeError(value);
  if (typeof value !== "object") return String(value);

  if (depth >= MAX_DEPTH) return "[depth-limit]";
  if (seen.has(value as object)) return "[circular]";
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => redact(v, depth + 1, seen));
  }
  if (isPostgrestLike(value as object)) return safeError(value);

  const out: LogFields = {};
  for (const [k, v] of Object.entries(value as LogFields)) {
    if (v === undefined) continue;
    out[k] = isSensitiveKey(k) ? "[redacted]" : redact(v, depth + 1, seen);
  }
  return out;
}

// ───────────────────────── Emissão ─────────────────────────
function createLogger(bindings: LogFields = {}): Logger {
  function emit(level: LogLevel, msg: string, fields: LogFields = {}): void {
    if (level === "debug" && process.env.NODE_ENV === "production") return;

    const merged = redact({ ...bindings, ...fields }) as LogFields;
    const record: LogRecord = {
      level,
      msg: scrubString(msg),
      ts: new Date().toISOString(),
      ...merged,
    };
    const line = JSON.stringify(record);
    if (level === "error" || level === "fatal") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  return {
    debug: (msg, fields) => emit("debug", msg, fields),
    info: (msg, fields) => emit("info", msg, fields),
    warn: (msg, fields) => emit("warn", msg, fields),
    error: (msg, fields) => emit("error", msg, fields),
    fatal: (msg, fields) => emit("fatal", msg, fields),
    child: (childBindings) => createLogger({ ...bindings, ...childBindings }),
  };
}

export const logger: Logger = createLogger();

export type { LogFields, Logger };
