"use server";

import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";

const MIN_PASSWORD = 8;

export async function resetPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!password || password.length < MIN_PASSWORD) {
    redirect(
      `/redefinir-senha?error=${encodeURIComponent(`Senha precisa ter pelo menos ${MIN_PASSWORD} caracteres`)}`,
    );
  }
  if (password !== confirm) {
    redirect("/redefinir-senha?error=Senhas%20n%C3%A3o%20conferem");
  }

  const supabase = await createClient();

  // Precisa de sessão (criada pelo /auth/callback após click no link)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      "/esqueci-senha?error=Link%20expirado%20ou%20inv%C3%A1lido.%20Solicite%20de%20novo",
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/redefinir-senha?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/painel?ok=Senha%20redefinida");
}
