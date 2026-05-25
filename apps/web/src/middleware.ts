import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@milsaca/db/web/middleware";

const PROTECTED_PREFIX = ["/painel", "/admin"];

const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export async function middleware(request: NextRequest) {
  // Sem Supabase configurado, deixa passar (modo "vitrine" / dev sem auth).
  if (!supabaseConfigured) return NextResponse.next({ request });

  const { response, user } = await updateSession(request);
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
    return NextResponse.redirect(url);
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
