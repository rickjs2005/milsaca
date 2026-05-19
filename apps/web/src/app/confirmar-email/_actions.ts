"use server";

import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { defaultRouteFor, isAppAdmin } from "@/lib/auth";
import { checkRateLimit, identityKey } from "@/lib/rate-limit";
import type { Profile } from "@milsaca/types";

/**
 * Verifica o código OTP de 6 dígitos enviado por email no signup.
 *
 * Usado em vez de magic link clicável porque o Gmail Safe Links faz
 * prefetch automático e queima links one-time-use. OTP digitado pelo
 * user é imune a isso.
 *
 * Pra produtor, gera sessão e redireciona pro painel.
 * Pra corretora, redireciona pra /aguardando-aprovacao (trigger já
 * marcou status=pendente independente da confirmação de email).
 */
export async function confirmEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "")
    .replace(/\D/g, "")
    .slice(0, 6);
  const isCorretora = formData.get("corretora") === "1";

  if (!email || token.length !== 6) {
    redirect(
      `/confirmar-email?email=${encodeURIComponent(email)}&error=${encodeURIComponent("Código inválido. São 6 dígitos.")}${isCorretora ? "&corretora=1" : ""}`,
    );
  }

  // Rate limit: 5 tentativas em 5min por email pra travar brute force
  // do OTP (1 milhão de combinações é apertado se atacante tiver thread).
  const rl = await checkRateLimit(identityKey("verify-email", email), 5, 300);
  if (!rl.allowed) {
    const msg = `Muitas tentativas. Tente de novo em ${rl.retryAfterSeconds}s.`;
    redirect(
      `/confirmar-email?email=${encodeURIComponent(email)}&error=${encodeURIComponent(msg)}${isCorretora ? "&corretora=1" : ""}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[confirmar-email] verifyOtp error:", error);
    }
    redirect(
      `/confirmar-email?email=${encodeURIComponent(email)}&error=${encodeURIComponent("Código incorreto ou expirado.")}${isCorretora ? "&corretora=1" : ""}`,
    );
  }

  // Corretora confirmou email → mas status segue pendente até admin aprovar
  if (isCorretora) {
    redirect(`/aguardando-aprovacao?email=${encodeURIComponent(email)}`);
  }

  // Produtor confirmou → vai pro painel direto
  if (await isAppAdmin()) {
    redirect("/admin");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?error=Sess%C3%A3o%20inv%C3%A1lida");

  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", user.id)
    .single<Pick<Profile, "roles">>();

  redirect(profile?.roles?.length ? defaultRouteFor(profile) : "/painel");
}

/**
 * Reenvia o código OTP. Rate-limited mais agressivo (3/h por email)
 * pra evitar abuso do envio de email (custo financeiro real no SMTP).
 */
export async function resendConfirmation(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const isCorretora = formData.get("corretora") === "1";
  const qs = (msg: string, kind: "ok" | "error") =>
    `/confirmar-email?email=${encodeURIComponent(email)}&${kind}=${encodeURIComponent(msg)}${isCorretora ? "&corretora=1" : ""}`;

  if (!email) {
    redirect(qs("Informe seu email.", "error"));
  }

  const rl = await checkRateLimit(identityKey("resend-email", email), 3, 3600);
  if (!rl.allowed) {
    redirect(
      qs(
        `Você pode reenviar novamente em ${Math.ceil(rl.retryAfterSeconds / 60)}min.`,
        "error",
      ),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[confirmar-email] resend error:", error);
    }
    // Anti-enumeration: mensagem genérica mesmo em erro
    redirect(qs("Se a conta existir, um novo código foi enviado.", "ok"));
  }

  redirect(qs("Novo código enviado. Confira seu email.", "ok"));
}
