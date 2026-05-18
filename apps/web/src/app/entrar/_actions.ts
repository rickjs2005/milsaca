"use server";

import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { defaultRouteFor } from "@/lib/auth";
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
