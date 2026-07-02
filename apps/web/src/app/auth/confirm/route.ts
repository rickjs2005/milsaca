import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@milsaca/db/web/server";
import { defaultRouteFor } from "@/lib/auth";
import { safeInternalPath } from "@/lib/safe-url";
import { logger, safeError } from "@/lib/logger";
import { tagSentryReqId } from "@/lib/req-logger";
import type { Profile } from "@milsaca/types";

/**
 * Verificação de OTP por token_hash (fluxo de confirmação por email).
 * Usado, por exemplo, em recuperação de senha ou confirmação de email.
 */
export async function GET(request: NextRequest) {
  const reqId = request.headers.get("x-request-id") ?? undefined;
  tagSentryReqId(reqId);
  const log = logger.child({ reqId });
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Sanitiza contra open redirect (achado de segurança S1): valor malicioso
  // (`@evil.com`, `//evil.com`) cai no fallback interno /painel.
  const nextRaw = searchParams.get("next");
  const next = safeInternalPath(nextRaw, "/painel");

  if (!token_hash || !type) {
    return NextResponse.redirect(
      `${origin}/entrar?error=Link%20inv%C3%A1lido`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) {
    // Mensagem genérica fixa: não ecoar error.message cru do Supabase na
    // query string (evita enumeração/diagnóstico). Padrão de
    // confirmar-email/_actions.ts.
    log.error("auth_verify_otp_falhou", { type, err: safeError(error) });
    return NextResponse.redirect(
      `${origin}/entrar?error=${encodeURIComponent("Link inválido ou expirado. Peça um novo.")}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      `${origin}/entrar?error=Sess%C3%A3o%20inv%C3%A1lida`,
    );
  }

  // Se o caller especificou `next` explicitamente (diferente do default
  // `/painel`), vence — padroniza com /auth/callback, importante pra
  // fluxos como reset de senha que precisam pousar em /redefinir-senha
  // em vez do painel.
  const nextWasExplicit = nextRaw !== null;
  if (nextWasExplicit) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", user.id)
    .single<Pick<Profile, "roles">>();

  const target = profile?.roles?.length
    ? defaultRouteFor(profile)
    : next;
  return NextResponse.redirect(`${origin}${target}`);
}
