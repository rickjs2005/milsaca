"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";

/**
 * Dispara email com link de recuperação. O link vai pro callback
 * (/auth/callback?code=...&next=/redefinir-senha) que troca o code por
 * sessão temporária e redireciona pra tela que pede nova senha.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    redirect("/esqueci-senha?error=Email%20obrigat%C3%B3rio");
  }

  const supabase = await createClient();
  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (h.get("origin") ?? `https://${h.get("host") ?? "localhost:3000"}`);

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/redefinir-senha`,
  });

  // Não vaza se o email existe ou não — sempre redireciona pro mesmo
  // estado de sucesso. Reduz superfície de enumeration.
  if (error) {
    console.error("[esqueci-senha] resetPasswordForEmail:", error.message);
  }

  const ok = `Se o email ${email} estiver cadastrado, vai chegar um link em alguns minutos.`;
  redirect(`/esqueci-senha?ok=${encodeURIComponent(ok)}`);
}
