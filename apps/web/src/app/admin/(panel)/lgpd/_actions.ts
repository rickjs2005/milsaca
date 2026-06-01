"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";

/**
 * Anonimização de titular (LGPD art. 18). Tem duas etapas:
 *
 *  1. RPC SECURITY DEFINER `anonimizar_titular`, que destrói a PII em texto
 *     pleno (nome/cpf/cnpj/telefone/email correlatos) e seta deleted_at.
 *  2. Admin API (`auth.admin.updateUserById`): neutraliza o e-mail de LOGIN
 *     em `auth.users` — que a RPC não alcança — trocando-o por um placeholder
 *     não-roteável (.invalid é TLD reservado) e banindo o login. Isso preserva
 *     a integridade das FKs com `profiles.id` (não usamos deleteUser).
 *
 * A guarda de admin é dupla: aqui via requireAppAdmin() e na própria RPC via
 * is_app_admin(). A etapa 2 é best-effort: se a SUPABASE_SECRET_KEY não estiver
 * configurada ou a Admin API falhar, o mascaramento (etapa 1) já está feito e o
 * fluxo retorna um AVISO parcial em vez de erro fatal.
 */
export async function anonimizarTitular(formData: FormData) {
  await requireAppAdmin();

  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) {
    redirect("/admin/lgpd?error=Informe%20o%20titular");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("anonimizar_titular", {
    p_user_id: userId,
  });

  if (error) {
    const log = await getReqLogger({ action: "anonimizarTitular", userId });
    log.error("anonimizar_titular_falhou", {
      code: error.code,
      err: safeError(error),
    });
    redirect(
      `/admin/lgpd?error=${encodeURIComponent(error.message ?? "Falha ao anonimizar")}`,
    );
  }

  // Etapa 2 — neutralizar o e-mail de login em auth.users via Admin API.
  const admin = createAdminClient();
  if (!admin) {
    const log = await getReqLogger({ action: "anonimizarTitular", userId });
    log.warn("anonimizar_titular_secret_key_ausente");
    revalidatePath("/admin/lgpd");
    redirect(
      "/admin/lgpd?warn=" +
        encodeURIComponent(
          "Dados mascarados, mas o e-mail em auth.users NÃO foi removido — configure SUPABASE_SECRET_KEY para concluir.",
        ),
    );
  }

  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    email: `anon-${userId}@anonimizado.invalid`,
    user_metadata: {},
    app_metadata: {},
    // ~100 anos: impede re-login com a conta anonimizada.
    ban_duration: "876000h",
  });

  if (authError) {
    const log = await getReqLogger({ action: "anonimizarTitular", userId });
    log.error("anonimizar_titular_auth_neutralizar_falhou", {
      err: safeError(authError),
    });
    revalidatePath("/admin/lgpd");
    redirect(
      "/admin/lgpd?warn=" +
        encodeURIComponent(
          "Dados mascarados, mas o e-mail em auth.users NÃO foi removido (Admin API: " +
            (authError.message ?? "erro desconhecido") +
            ").",
        ),
    );
  }

  revalidatePath("/admin/lgpd");
  redirect("/admin/lgpd?ok=Titular%20anonimizado%20(dados%20e%20login%20neutralizados)");
}
