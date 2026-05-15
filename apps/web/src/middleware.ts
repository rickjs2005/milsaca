import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@milsaca/db/web/middleware";

const PROTECTED_PREFIX = ["/painel", "/admin"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const requiresAuth = PROTECTED_PREFIX.some((p) => pathname.startsWith(p));
  if (requiresAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("redirectTo", pathname);
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
