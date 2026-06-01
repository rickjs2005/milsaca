// Logger estruturado mínimo pro mobile (React Native / Expo).
//
// Espelha o conceito do logger do web (`apps/web/src/lib/logger.ts`):
// logs em JSON de uma linha, SEM PII (email, CPF/CNPJ, telefone, nome,
// token, senha, sessão) — nem em chaves, nem aninhada, nem na `msg`.
// A checagem de chave sensível é por TOKEN (camelCase/snake_case são
// quebrados em palavras), não por substring, pra não dar falso-positivo.
//
// SINK DE PRODUÇÃO — FOLLOW-UP:
//   Em `__DEV__` este logger emite no `console.*` (JSON em uma linha) pra
//   ficar visível no Metro/Flipper. Em release ele NÃO emite no console
//   (ruído e risco de PII em logs de device). O sink de produção pretendido
//   é o Sentry React Native (`@sentry/react-native`), que NÃO foi instalado
//   aqui porque exige config nativa/EAS impossível de verificar neste
//   ambiente. Quando o Sentry RN entrar, plugar a emissão de release em
//   `emit()` (ex.: `Sentry.captureMessage` / `Sentry.captureException`
//   reaproveitando `safeError`). Até lá, release = silencioso no console.
//
// Uso:
//   import { logger, safeError } from "@/lib/logger";  // ou caminho relativo
//   logger.error("responder_proposta_falhou", { propostaId, err: safeError(e) });

type LogLevel = "debug" | "info" | "warn" | "error";

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
}

// ───────────────────────── Masking de PII ─────────────────────────
// Tokens (palavras) cujo nome de campo indica PII/segredo.
const PII_TOKENS = new Set([
  "email", "mail", "cpf", "cnpj", "document", "documento", "rg", "pix",
  "phone", "telefone", "tel", "celular", "whatsapp", "cep",
  "password", "senha", "pass", "secret", "token", "authorization", "cookie",
  "session", "apikey", "name", "nome", "fullname", "firstname",
  "lastname", "sobrenome", "address", "endereco", "bairro",
]);

// Chaves seguras que contêm token de PII mas NÃO são PII — vencem a denylist.
const SAFE_KEYS = new Set([
  "action", "code", "kind", "status", "rpc", "level", "field", "step",
  "to", "from", "count", "corretoraid", "produtorid", "compradorid",
  "userid", "profileid", "loteid", "contratoid", "leadid", "pagamentoid",
  "entregaid", "propostaid", "ofertaid",
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
  if (out.length > MAX_STRING) {
    out = `${out.slice(0, MAX_STRING)}…[+${out.length - MAX_STRING}]`;
  }
  return out;
}

function isPostgrestLike(v: object): boolean {
  return "message" in v && ("code" in v || "details" in v || "hint" in v);
}

/**
 * Serializa um erro pra log com segurança: só `name`/`code`/`message` (com a
 * mensagem passada pelo scrub). NUNCA `details`/`hint` (o Postgres embute
 * valores de linha — ex.: `Key (email)=(...)`). `stack` só em `__DEV__`.
 */
export function safeError(err: unknown): LogFields {
  if (err instanceof Error) {
    const out: LogFields = { name: err.name, message: scrubString(err.message) };
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string" || typeof code === "number") out.code = code;
    if (__DEV__ && err.stack) out.stack = scrubString(err.stack);
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
export function sanitize(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return scrubString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Error) return safeError(value);
  if (typeof value !== "object") return String(value);

  if (depth >= MAX_DEPTH) return "[depth-limit]";
  if (seen.has(value as object)) return "[circular]";
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => sanitize(v, depth + 1, seen));
  }
  if (isPostgrestLike(value as object)) return safeError(value);

  const out: LogFields = {};
  for (const [k, v] of Object.entries(value as LogFields)) {
    if (v === undefined) continue;
    out[k] = isSensitiveKey(k) ? "[redacted]" : sanitize(v, depth + 1, seen);
  }
  return out;
}

// ───────────────────────── Emissão ─────────────────────────
function emit(level: LogLevel, msg: string, fields: LogFields = {}): void {
  // Em release, o console é silencioso — o sink de produção (Sentry RN) é
  // follow-up (ver bloco no topo). Mantemos a API no-op pra não vazar PII
  // nem ruído em logs de device.
  if (!__DEV__) return;

  const merged = sanitize(fields) as LogFields;
  const record: LogRecord = {
    level,
    msg: scrubString(msg),
    ts: new Date().toISOString(),
    ...merged,
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

export const logger: Logger = {
  debug: (msg, fields) => emit("debug", msg, fields),
  info: (msg, fields) => emit("info", msg, fields),
  warn: (msg, fields) => emit("warn", msg, fields),
  error: (msg, fields) => emit("error", msg, fields),
};

export type { LogLevel, LogFields, Logger };
