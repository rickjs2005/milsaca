"use server";

import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { defaultRouteFor } from "@/lib/auth";
import type { Profile } from "@milsaca/types";

/**
 * Envia OTP por email pra entrar OU criar conta.
 * Em vez de magic link (que o Gmail consome no prefetch), o usuário
 * recebe um código de 6 dígitos pra colar em /entrar/verificar.
 *
 * Se for primeiro acesso, `shouldCreateUser: true` cria o user em
 * auth.users, e o trigger `handle_new_user` cria o profile correspondente.
 * O campo `full_name` é passado via raw_user_meta_data e usado pelo trigger.
 */
export async function sendCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/painel");

  if (!email) {
    redirect("/entrar?error=Email%20obrigat%C3%B3rio");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: fullName ? { full_name: fullName } : undefined,
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

  // Decide o destino pelos papéis do profile.
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

