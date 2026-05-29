import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@milsaca/db/web/middleware";

const PROTECTED_PREFIX = ["/painel", "/admin"];

const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export async function middleware(request: NextRequest) {
  // Correlação de logs: reaproveita o x-request-id recebido (ex.: de um proxy)
  // ou gera um novo. Propaga no request (pra server code ler via headers()) e
  // na response (pra cliente/observabilidade correlacionarem).
  const reqId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  request.headers.set("x-request-id", reqId);

  // Sem Supabase configurado, deixa passar (modo "vitrine" / dev sem auth).
  if (!supabaseConfigured) {
    const passthrough = NextResponse.next({ request });
    passthrough.headers.set("x-request-id", reqId);
    return passthrough;
  }

  const { response, user } = await updateSession(request);
  response.headers.set("x-request-id", reqId);
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
