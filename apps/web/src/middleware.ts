import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@milsaca/db/web/middleware";

const PROTECTED_PREFIX = ["/painel", "/admin"];

const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

/**
 * CSP com NONCE por request (P1 da auditoria 2026-06-12). Antes vivia no
 * next.config com `'unsafe-inline'` em script-src — o que anulava a proteção
 * contra script injetado. Com nonce + 'strict-dynamic', os scripts inline do
 * Next e o script de tema (layout lê o nonce via headers()) executam, e
 * qualquer outro inline é bloqueado.
 *
 * Mantido do config antigo: style-src 'unsafe-inline' (Tailwind/Next runtime,
 * dívida documentada), img-src amplo, media-src do Storage, connect-src
 * Supabase/IBGE/Sentry. 'unsafe-eval' só em dev (Turbopack).
 */
function buildCsp(nonce: string, isDev: boolean): string {
  const supabaseHost =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, "") ?? "";
  const supabaseHttps = supabaseHost ? `https://${supabaseHost}` : "";
  const supabaseWss = supabaseHost ? `wss://${supabaseHost}` : "";

  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (isDev) scriptSrc.push("'unsafe-eval'", "'unsafe-inline'");

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https:",
      "https://*.tile.openstreetmap.org",
      "https://unpkg.com",
    ],
    "media-src": ["'self'", supabaseHttps, "blob:"].filter(Boolean),
    "connect-src": [
      "'self'",
      supabaseHttps,
      supabaseWss,
      "https://servicodados.ibge.gov.br",
      "https://api.ibge.gov.br",
      "https://*.sentry.io",
      "https://*.ingest.sentry.io",
    ].filter(Boolean),
    "frame-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  // Só em produção (HTTPS). Em dev o servidor é HTTP; forçar upgrade quebra
  // o acesso por IP de LAN (ex.: testar no celular) — o navegador tenta
  // https://<ip>:3000 e o CSS/JS falha. localhost é isento, IP de LAN não.
  if (!isDev) directives["upgrade-insecure-requests"] = [];

  return Object.entries(directives)
    .map(([k, v]) => (v.length > 0 ? `${k} ${v.join(" ")}` : k))
    .join("; ");
}

export async function middleware(request: NextRequest) {
  // Correlação de logs: reaproveita o x-request-id recebido (ex.: de um proxy)
  // ou gera um novo. Propaga no request (pra server code ler via headers()) e
  // na response (pra cliente/observabilidade correlacionarem).
  const reqId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  request.headers.set("x-request-id", reqId);

  // Nonce de CSP por request — o layout raiz lê via headers("x-nonce") e o
  // Next propaga pros scripts inline dele.
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, process.env.NODE_ENV !== "production");
  request.headers.set("x-nonce", nonce);

  // Sem Supabase configurado, deixa passar (modo "vitrine" / dev sem auth).
  if (!supabaseConfigured) {
    const passthrough = NextResponse.next({ request });
    passthrough.headers.set("x-request-id", reqId);
    passthrough.headers.set("Content-Security-Policy", csp);
    return passthrough;
  }

  const { response, user } = await updateSession(request);
  response.headers.set("x-request-id", reqId);
  response.headers.set("Content-Security-Policy", csp);
  const { pathname } = request.nextUrl;

  // /admin/login é pública (é a própria porta de entrada) — evita loop.
  const isAdminLogin = pathname === "/admin/login";
  const requiresAuth =
    !isAdminLogin && PROTECTED_PREFIX.some((p) => pathname.startsWith(p));
  if (requiresAuth && !user) {
    const url = request.nextUrl.clone();
    if (pathname.startsWith("/admin")) {
      // Admin tem tela dedicada; sem redirectTo pra não confundir.
      url.pathname = "/admin/login";
      url.search = "";
    } else {
      url.pathname = "/entrar";
      url.searchParams.set("redirectTo", pathname);
    }
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("x-request-id", reqId);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match todas as rotas exceto:
     * - _next/static, _next/image, favicon.ico
     * - arquivos estáticos comuns
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
