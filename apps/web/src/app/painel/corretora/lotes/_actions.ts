"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import { ensureCorretora, requireActiveSubscription } from "../_lib/corretora";
import {
  createLoteSchema,
  flattenZodErrors,
  formDataToObject,
} from "../_lib/schemas";
import { LOTE_STATUS_ORDER, type LoteStatus } from "./_lib/lote-meta";
import { listProdutores } from "./_lib/queries";

function isLoteStatus(v: string): v is LoteStatus {
  return (LOTE_STATUS_ORDER as readonly string[]).includes(v);
}

export async function createLote(formData: FormData) {
  const profile = await ensureCorretora();
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/lotes",
  );

  const parsed = createLoteSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    const params = new URLSearchParams({
      error: flattenZodErrors(parsed.error),
    });
    redirect(`/painel/corretora/lotes/novo?${params.toString()}`);
  }
  const fields = parsed.data;

  // Defesa em profundidade: o produtor precisa pertencer ao universo da
  // corretora (mesmas leads/contratos/favoritos do picker). Bloqueia POST
  // direto com UUID arbitrário de outro tenant.
  const produtoresPermitidos = await listProdutores(profile.corretora_id);
  if (!produtoresPermitidos.some((p) => p.id === fields.produtor_id)) {
    const log = await getReqLogger({
      action: "createLote",
      corretoraId: profile.corretora_id,
    });
    log.error("lote_produtor_invalido", {
      produtorId: fields.produtor_id,
    });
    const params = new URLSearchParams({
      error: "Produtor inválido para esta corretora.",
    });
    redirect(`/painel/corretora/lotes/novo?${params.toString()}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lotes")
    .insert({
      corretora_id: profile.corretora_id,
      ...fields,
      status: "aguardando_classificacao",
    })
    .select("id")
    .single();

  if (error) {
    const log = await getReqLogger({
      action: "createLote",
      corretoraId: profile.corretora_id,
    });
    log.error("lote_insert_falhou", {
      code: error.code,
      err: safeError(error),
    });
    const params = new URLSearchParams({
      error: friendlyPostgresError(error),
    });
    redirect(`/painel/corretora/lotes/novo?${params.toString()}`);
  }

  revalidatePath("/painel/corretora/lotes");
  redirect(`/painel/corretora/lotes/${data.id}`);
}

/**
 * Move o status do lote. Defesa em profundidade: filtra por corretora_id
 * além da RLS (impede id de outra corretora bater por engano).
 */
export async function updateLoteStatus(formData: FormData) {
  const profile = await ensureCorretora();
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/lotes",
  );

  const id = String(formData.get("id") ?? "").trim();
  const next = String(formData.get("status") ?? "").trim();
  if (!id || !isLoteStatus(next)) redirect("/painel/corretora/lotes");

  const supabase = await createClient();
  const { error } = await supabase
    .from("lotes")
    .update({ status: next as LoteStatus })
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id);

  if (error) {
    const log = await getReqLogger({
      action: "updateLoteStatus",
      corretoraId: profile.corretora_id,
      loteId: id,
    });
    log.error("lote_status_update_falhou", {
      to: next,
      code: error.code,
      err: safeError(error),
    });
    const params = new URLSearchParams({
      error: friendlyPostgresError(error),
    });
    redirect(`/painel/corretora/lotes?${params.toString()}`);
  }

  revalidatePath("/painel/corretora/lotes");
  revalidatePath(`/painel/corretora/lotes/${id}`);
  revalidatePath("/painel/corretora");
  redirect("/painel/corretora/lotes?ok=Status%20atualizado");
}
