import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@milsaca/db/web/server";
import { defaultRouteFor } from "@/lib/auth";
import type { Profile } from "@milsaca/types";

/**
 * Callback do fluxo OAuth/PKCE.
 * Chega aqui após o usuário clicar no magic link do email.
 *
 * Regra de ouro: NUNCA deixar o usuário preso na tela de login.
 * Se a sessão validar, mandar para o painel correto.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(
      `${origin}/entrar?error=C%C3%B3digo%20ausente`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/entrar?error=${encodeURIComponent(error.message)}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/entrar?error=Sess%C3%A3o%20inv%C3%A1lida`);
  }

  // Se o caller especificou `next`, vence — fluxo de reset de senha
  // depende disso pra parar em /redefinir-senha em vez de cair no painel.
  if (nextParam) {
    return NextResponse.redirect(`${origin}${nextParam}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", user.id)
    .single<Pick<Profile, "roles">>();

  const target = profile?.roles?.length
    ? defaultRouteFor(profile)
    : "/painel";

  return NextResponse.redirect(`${origin}${target}`);
}
