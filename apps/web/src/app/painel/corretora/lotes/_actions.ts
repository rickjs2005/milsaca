"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { sacasParaKg } from "@/lib/unidades";
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

  // peso_sacas virou coluna GERADA (peso_kg/60). A corretora ainda digita em
  // sacas no form, então convertemos pra kg (a verdade) e NUNCA gravamos
  // peso_sacas direto. Ver @/lib/unidades e migration 20261060.
  const { peso_sacas, ...loteFields } = fields;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lotes")
    .insert({
      corretora_id: profile.corretora_id,
      ...loteFields,
      peso_kg: peso_sacas != null ? sacasParaKg(peso_sacas) : null,
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

  // Lote VENDIDO é terminal: o café já foi negociado/entregue. Não volta pra
  // rascunho/classificado etc. (o re-fluxo de classificação entre os outros
  // estados segue livre). Compare-and-set evita corrida.
  const { data: atual } = await supabase
    .from("lotes")
    .select("status")
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle<{ status: LoteStatus }>();
  if (!atual) redirect("/painel/corretora/lotes");
  if (atual.status === "vendido") {
    const params = new URLSearchParams({
      error: "Lote vendido não muda de status — o café já foi negociado.",
    });
    redirect(`/painel/corretora/lotes?${params.toString()}`);
  }

  const { data: updated, error } = await supabase
    .from("lotes")
    .update({ status: next as LoteStatus })
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id)
    .eq("status", atual.status)
    .select("id");

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
  if (!updated || updated.length === 0) {
    redirect(
      `/painel/corretora/lotes?error=${encodeURIComponent("O lote já foi atualizado por outra ação. Recarregue.")}`,
    );
  }

  revalidatePath("/painel/corretora/lotes");
  revalidatePath(`/painel/corretora/lotes/${id}`);
  revalidatePath("/painel/corretora");
  redirect("/painel/corretora/lotes?ok=Status%20atualizado");
}

// -----------------------------------------------------------------
// EUDR (F2): vínculo lote ↔ talhões georreferenciados
// -----------------------------------------------------------------

/**
 * Vincula um talhão do produtor ao lote (origem EUDR). A RLS de
 * lote_talhoes valida no with check que o talhão pertence ao produtor
 * do lote — aqui só traduzimos o erro pra mensagem amigável.
 */
export async function vincularTalhao(formData: FormData) {
  const profile = await ensureCorretora();
  const loteId = String(formData.get("lote_id") ?? "").trim();
  const talhaoId = String(formData.get("talhao_id") ?? "").trim();
  const back = `/painel/corretora/lotes/${loteId}`;

  if (!loteId || !talhaoId) {
    redirect(`${back}?error=${encodeURIComponent("Selecione um talhão.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("lote_talhoes")
    .insert({ lote_id: loteId, talhao_id: talhaoId });

  if (error) {
    if (error.code === "23505") {
      redirect(
        `${back}?error=${encodeURIComponent("Este talhão já está vinculado ao lote.")}`,
      );
    }
    if (error.code === "42501") {
      redirect(
        `${back}?error=${encodeURIComponent("Talhão não pertence ao produtor deste lote.")}`,
      );
    }
    const log = await getReqLogger({
      action: "vincularTalhao",
      corretoraId: profile.corretora_id,
      loteId,
    });
    log.error("lote_talhao_vincular_falhou", {
      code: error.code,
      err: safeError(error),
    });
    redirect(`${back}?error=${encodeURIComponent(friendlyPostgresError(error))}`);
  }

  revalidatePath(back);
  redirect(`${back}?saved=${encodeURIComponent("Talhão vinculado ao lote.")}`);
}

/** Remove o vínculo lote↔talhão (não apaga o talhão do produtor). */
export async function desvincularTalhao(formData: FormData) {
  const profile = await ensureCorretora();
  const loteId = String(formData.get("lote_id") ?? "").trim();
  const talhaoId = String(formData.get("talhao_id") ?? "").trim();
  const back = `/painel/corretora/lotes/${loteId}`;

  if (!loteId || !talhaoId) redirect(back);

  const supabase = await createClient();
  const { error } = await supabase
    .from("lote_talhoes")
    .delete()
    .eq("lote_id", loteId)
    .eq("talhao_id", talhaoId);

  if (error) {
    const log = await getReqLogger({
      action: "desvincularTalhao",
      corretoraId: profile.corretora_id,
      loteId,
    });
    log.error("lote_talhao_desvincular_falhou", {
      code: error.code,
      err: safeError(error),
    });
    redirect(`${back}?error=${encodeURIComponent(friendlyPostgresError(error))}`);
  }

  revalidatePath(back);
  redirect(`${back}?saved=${encodeURIComponent("Vínculo removido.")}`);
}
