/**
 * Sanitização de URL fornecida por usuário (site da corretora, logo etc.).
 *
 * Achado da auditoria 2026-06-12: `site_url` aceitava qualquer texto e era
 * renderizado em <a href> na página pública /c/[slug] — `javascript:...`
 * vira XSS armazenado. Regra: só http/https; sem scheme, assume https://;
 * qualquer outra coisa vira null.
 */
/**
 * Allowlist de redirect interno (auditoria 2026-06-12: `redirectTo` cru em
 * `redirect()` permitia open redirect pra fora no ramo de conta sem papel).
 * Só aceita caminho local: começa com "/" e não com "//" nem "/\".
 */
export function safeInternalPath(
  value: string | null | undefined,
  fallback = "/painel",
): string {
  const s = (value ?? "").trim();
  if (!s.startsWith("/") || s.startsWith("//") || s.startsWith("/\\")) {
    return fallback;
  }
  return s;
}

export function sanitizeHttpUrl(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  let s = value.trim();
  if (!s) return null;
  // sem scheme ("milsaca.com.br") → https://
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = `https://${s}`;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return url.toString();
}
