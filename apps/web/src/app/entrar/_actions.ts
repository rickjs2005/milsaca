"use server";

import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { defaultRouteFor, isAppAdmin } from "@/lib/auth";
import { checkRateLimit, identityKey } from "@/lib/rate-limit";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import type { Profile } from "@milsaca/types";

/**
 * Login com email + senha. Substitui o fluxo de OTP de 6 dígitos.
 * Pra criar conta nova, usar /cadastrar. Pra recuperar senha esquecida,
 * usar /esqueci-senha.
 */
export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/painel");

  if (!email || !password) {
    redirect("/entrar?error=Email%20e%20senha%20obrigat%C3%B3rios");
  }

  // Rate limit por email: 5 tentativas em 5min. Anti-brute force.
  const rl = await checkRateLimit(identityKey("signin", email), 5, 300);
  if (!rl.allowed) {
    const msg = `Muitas tentativas. Tente de novo em ${rl.retryAfterSeconds}s.`;
    redirect(
      `/entrar?error=${encodeURIComponent(msg)}&email=${encodeURIComponent(email)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const log = await getReqLogger({ action: "signIn" });
    log.warn("signin_credencial_falhou", { err: safeError(error) });
    const params = new URLSearchParams({
      email,
      error: error.message,
    });
    if (redirectTo !== "/painel") params.set("redirectTo", redirectTo);
    redirect(`/entrar?${params.toString()}`);
  }

  // Step-up MFA: se o user tem fator TOTP verified, ele está em AAL1
  // após password e precisa subir pra AAL2 antes de chegar no painel.
  // getAuthenticatorAssuranceLevel retorna { currentLevel, nextLevel };
  // se diferentes, MFA é necessário.
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (
    aal?.currentLevel === "aal1" &&
    aal?.nextLevel === "aal2"
  ) {
    const params = new URLSearchParams();
    if (redirectTo !== "/painel") params.set("redirectTo", redirectTo);
    redirect(
      `/entrar/mfa${params.toString() ? `?${params.toString()}` : ""}`,
    );
  }

  // Decide o destino pelos papéis do profile
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar?error=Sess%C3%A3o%20inv%C3%A1lida");
  }

  // Superuser: vai direto pra /admin antes de qualquer decisão de painel.
  if (await isAppAdmin()) {
    redirect("/admin");
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", user.id)
    .single<Pick<Profile, "roles">>();
  if (profileErr) {
    const log = await getReqLogger({ action: "signIn", userId: user.id });
    log.error("signin_profile_fetch_falhou", { err: safeError(profileErr) });
  }

  const target = profile?.roles?.length
    ? defaultRouteFor(profile)
    : redirectTo;
  redirect(target);
}

/**
 * Verifica o código TOTP no flow de step-up. Chamada pelo form em
 * /entrar/mfa após signIn bem-sucedido que detectou AAL1 → AAL2.
 */
export async function verifyMfa(formData: FormData) {
  const factorId = String(formData.get("factor_id") ?? "").trim();
  const code = String(formData.get("code") ?? "")
    .replace(/\D/g, "")
    .slice(0, 6);
  const redirectTo = String(formData.get("redirectTo") ?? "/painel");

  if (!factorId || code.length !== 6) {
    redirect("/entrar/mfa?error=C%C3%B3digo%20inv%C3%A1lido");
  }

  const supabase = await createClient();

  const { data: challenge, error: cErr } =
    await supabase.auth.mfa.challenge({ factorId });
  if (cErr || !challenge) {
    const log = await getReqLogger({ action: "verifyMfa" });
    log.warn("mfa_challenge_falhou", { err: safeError(cErr) });
    redirect(
      `/entrar/mfa?error=${encodeURIComponent("Falha ao validar. Tente de novo.")}`,
    );
  }

  const { error: vErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (vErr) {
    const log = await getReqLogger({ action: "verifyMfa" });
    log.warn("mfa_verify_falhou", { err: safeError(vErr) });
    redirect(
      `/entrar/mfa?error=${encodeURIComponent("Código incorreto. Tente de novo.")}`,
    );
  }

  // Após verify, AAL sobe pra aal2. Continua o fluxo normal.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar?error=Sess%C3%A3o%20inv%C3%A1lida");
  }

  if (await isAppAdmin()) {
    redirect("/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", user.id)
    .single<Pick<Profile, "roles">>();

  const target = profile?.roles?.length
    ? defaultRouteFor(profile)
    : redirectTo;
  redirect(target);
}
