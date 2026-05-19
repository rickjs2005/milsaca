"use server";

import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { defaultRouteFor, isAppAdmin } from "@/lib/auth";
import { checkRateLimit, identityKey } from "@/lib/rate-limit";
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
    const params = new URLSearchParams({
      email,
      error: error.message,
    });
    if (redirectTo !== "/painel") params.set("redirectTo", redirectTo);
    redirect(`/entrar?${params.toString()}`);
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
