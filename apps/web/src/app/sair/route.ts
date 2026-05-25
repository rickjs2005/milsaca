import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@milsaca/db/web/server";

/**
 * Logout. SOMENTE POST.
 *
 * Por que não GET: prefetch de browser (e Gmail Safe Links) pode pegar
 * qualquer <a href="/sair"> e deslogar o user antes do click acontecer.
 * O mesmo motivo do magic link OTP — qualquer GET com side-effect é
 * vulnerável. Use <form action="/sair" method="post"> nos call sites.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { origin } = new URL(request.url);
  // Admin saindo do /admin volta pra tela de login do admin, não a genérica.
  const referer = request.headers.get("referer") ?? "";
  const fromAdmin = (() => {
    try {
      return new URL(referer).pathname.startsWith("/admin");
    } catch {
      return false;
    }
  })();
  const target = fromAdmin ? "/admin/login" : "/entrar";
  return NextResponse.redirect(`${origin}${target}`, { status: 303 });
}

// GET intencionalmente ausente — ver comentário acima.
export function GET() {
  return new NextResponse(
    "Method Not Allowed — POST /sair em form (anti-prefetch)",
    { status: 405, headers: { Allow: "POST" } },
  );
}
