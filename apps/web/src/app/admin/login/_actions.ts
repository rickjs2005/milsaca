"use server";

import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { isAppAdmin } from "@/lib/auth";
import { checkRateLimit, identityKey } from "@/lib/rate-limit";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";

/**
 * Login dedicado da área administrativa. Diferente de /entrar (que aceita
 * qualquer profile), aqui só passa quem está em public.app_admins.
 *
 * Se o user existir e a senha bater mas ele NÃO for app_admin, faz signOut
 * imediatamente — não dá margem pra produtor/corretora ficar logado por
 * essa rota.
 */
export async function signInAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/admin/login?error=Email%20e%20senha%20obrigat%C3%B3rios");
  }

  const rl = await checkRateLimit(identityKey("signin-admin", email), 5, 300);
  if (!rl.allowed) {
    const msg = `Muitas tentativas. Tente de novo em ${rl.retryAfterSeconds}s.`;
    redirect(
      `/admin/login?error=${encodeURIComponent(msg)}&email=${encodeURIComponent(email)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const log = await getReqLogger({ action: "signInAdmin" });
    log.warn("admin_signin_credencial_falhou", { err: safeError(error) });
    const params = new URLSearchParams({ email, error: error.message });
    redirect(`/admin/login?${params.toString()}`);
  }

  // Step-up MFA (mesmo fluxo de /entrar)
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
    redirect("/entrar/mfa?redirectTo=%2Fadmin");
  }

  // Bloqueia quem não é operador da plataforma
  if (!(await isAppAdmin())) {
    const log = await getReqLogger({ action: "signInAdmin" });
    log.warn("admin_login_nao_autorizado");
    await supabase.auth.signOut();
    redirect(
      "/admin/login?error=" +
        encodeURIComponent("Esta conta não tem acesso ao admin."),
    );
  }

  redirect("/admin");
}
