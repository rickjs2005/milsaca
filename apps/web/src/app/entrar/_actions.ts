"use server";

import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Envia magic link (OTP por email) para o usuário produtor.
 */
export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const redirectTo = String(formData.get("redirectTo") ?? "/painel");

  if (!email) {
    redirect("/entrar?error=Email%20obrigat%C3%B3rio");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect(`/entrar?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/entrar?sent=1");
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
