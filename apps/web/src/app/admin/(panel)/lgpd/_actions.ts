"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";

/**
 * Anonimização de titular (LGPD art. 18). Chama a RPC SECURITY DEFINER
 * anonimizar_titular, que destrói a PII em texto pleno (nome/cpf/cnpj/
 * telefone/email) e seta deleted_at. A guarda de admin é dupla: aqui via
 * requireAppAdmin() e na própria RPC via is_app_admin().
 *
 * Cast localizado porque a RPC ainda não está nos tipos gerados (não
 * rodamos db:types nesta fase).
 */
export async function anonimizarTitular(formData: FormData) {
  await requireAppAdmin();

  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) {
    redirect("/admin/lgpd?error=Informe%20o%20titular");
  }

  const supabase = await createClient();
  const { error } = await (
    supabase.rpc as unknown as (
      name: string,
      args?: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message?: string } | null }>
  )("anonimizar_titular", { p_user_id: userId });

  if (error) {
    redirect(
      `/admin/lgpd?error=${encodeURIComponent(error.message ?? "Falha ao anonimizar")}`,
    );
  }

  revalidatePath("/admin/lgpd");
  redirect("/admin/lgpd?ok=Titular%20anonimizado");
}
