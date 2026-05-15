"use server";

import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { defaultRouteFor } from "@/lib/auth";
import type { Profile } from "@milsaca/types";

/**
 * Envia OTP por email para o produtor.
 * Em vez de magic link (que o Gmail consome no prefetch), o usuário
 * recebe um código de 6 dígitos para colar em /entrar/verificar.
 */
export async function sendCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const redirectTo = String(formData.get("redirectTo") ?? "/painel");

  if (!email) {
    redirect("/entrar?error=Email%20obrigat%C3%B3rio");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect(`/entrar?error=${encodeURIComponent(error.message)}`);
  }

  const params = new URLSearchParams({ email, redirectTo });
  redirect(`/entrar/verificar?${params.toString()}`);
}

/**
 * Verifica o código OTP digitado pelo usuário e cria a sessão.
 */
export async function verifyCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/painel");

  if (!email || !token) {
    redirect(
      `/entrar/verificar?email=${encodeURIComponent(email)}&error=C%C3%B3digo%20obrigat%C3%B3rio`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    redirect(
      `/entrar/verificar?email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`,
    );
  }

  // Decide o destino pelo role do profile.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar?error=Sess%C3%A3o%20inv%C3%A1lida");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<Pick<Profile, "role">>();

  const target = profile?.role ? defaultRouteFor(profile.role) : redirectTo;
  redirect(target);
}

/**
 * Login da corretora com email + senha.
 */
export async function signInCorretora(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/painel/corretora");

  if (!email || !password) {
    redirect("/entrar/corretora?error=Email%20e%20senha%20s%C3%A3o%20obrigat%C3%B3rios");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/entrar/corretora?error=${encodeURIComponent(error.message)}`);
  }
  redirect(redirectTo);
}
