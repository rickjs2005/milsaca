"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import { uuidSchema } from "../_lib/schemas";
import { ensureCorretora, requireActiveSubscription } from "../_lib/corretora";
import type { OfertaStatus } from "./_lib/queries";

const STATUS_VALIDOS: OfertaStatus[] = [
  "enviada",
  "aceita",
  "recusada",
  "expirada",
];

// Máquina de estados da oferta ao comprador. Só `enviada` responde; uma vez
// aceita/recusada/expirada é TERMINAL (aceita vira base de contrato).
const OFERTA_TRANSICOES: Record<OfertaStatus, OfertaStatus[]> = {
  rascunho: ["enviada"],
  enviada: ["aceita", "recusada", "expirada"],
  aceita: [],
  recusada: [],
  expirada: [],
};

function parseBRL(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseInt0(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function safeBack(v: FormDataEntryValue | null): string {
  const s = String(v ?? "").trim();
  return s.startsWith("/painel/corretora/")
    ? s
    : "/painel/corretora/ofertas";
}

function revalidateAffected(extra?: string) {
  revalidatePath("/painel/corretora/ofertas");
  if (extra) revalidatePath(extra);
}

export async function createOferta(formData: FormData) {
  const profile = await ensureCorretora();
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/ofertas",
  );

  const back = safeBack(formData.get("redirect_to"));
  const compradorParsed = uuidSchema.safeParse(
    String(formData.get("comprador_id") ?? "").trim(),
  );
  const loteRaw = String(formData.get("lote_id") ?? "").trim();
  const loteId = loteRaw ? loteRaw : null;
  const preco = parseBRL(formData.get("preco_saca"));
  const bagCount = parseInt0(formData.get("bag_count"));
  const validade = String(formData.get("validade_ate") ?? "").trim() || null;
  const mensagem = String(formData.get("mensagem") ?? "").trim() || null;

  const errors: string[] = [];
  if (!compradorParsed.success) errors.push("Selecione um comprador");
  if (preco == null || preco <= 0) errors.push("Preço por saca inválido");
  if (loteId && !uuidSchema.safeParse(loteId).success)
    errors.push("Lote inválido");
  if (errors.length > 0) {
    redirect(`${back}?error=${encodeURIComponent(errors.join(", "))}`);
  }

  const supabase = await createClient();

  // Defesa em profundidade: se a oferta referencia um lote, ele precisa
  // ser desta corretora (a RLS de INSERT só garante `corretora_id = meu`,
  // não a posse do lote referenciado). Bloqueia POST com lote de outro tenant.
  if (loteId) {
    const { data: loteOwn } = await supabase
      .from("lotes")
      .select("id")
      .eq("id", loteId)
      .eq("corretora_id", profile.corretora_id)
      .maybeSingle<{ id: string }>();
    if (!loteOwn) {
      const log = await getReqLogger({
        action: "createOferta",
        corretoraId: profile.corretora_id,
      });
      log.error("oferta_lote_invalido", { loteId });
      redirect(
        `${back}?error=${encodeURIComponent("Lote inválido para esta corretora.")}`,
      );
    }
  }

  const { error } = await supabase.from("ofertas_comprador").insert({
    corretora_id: profile.corretora_id,
    // validado acima (redirect on !success), logo data é definido
    comprador_id: compradorParsed.data!,
    lote_id: loteId,
    preco_saca: preco as number,
    bag_count: bagCount,
    validade_ate: validade,
    mensagem,
    status: "enviada",
    created_by: profile.id,
  });

  if (error) {
    const log = await getReqLogger({
      action: "createOferta",
      corretoraId: profile.corretora_id,
    });
    log.error("oferta_insert_falhou", {
      code: error.code,
      err: safeError(error),
    });
    redirect(`${back}?error=${encodeURIComponent(friendlyPostgresError(error))}`);
  }

  revalidateAffected(loteId ? `/painel/corretora/lotes/${loteId}` : undefined);
  redirect(`${back}?saved=${encodeURIComponent("Oferta registrada.")}`);
}

export async function atualizarStatusOferta(formData: FormData) {
  const profile = await ensureCorretora();

  const back = safeBack(formData.get("redirect_to"));
  const idParsed = uuidSchema.safeParse(String(formData.get("id") ?? "").trim());
  const status = String(formData.get("status") ?? "").trim() as OfertaStatus;
  if (!idParsed.success || !STATUS_VALIDOS.includes(status)) {
    redirect(back);
  }

  const supabase = await createClient();

  // Guard de transição + compare-and-set: só transiciona a partir de 'enviada'
  // e só se o status no banco ainda for o lido (evita reverter oferta terminal
  // ou corrida com outra ação).
  const { data: atual } = await supabase
    .from("ofertas_comprador")
    .select("status, lote_id")
    .eq("id", idParsed.data)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle<{ status: OfertaStatus; lote_id: string | null }>();
  if (!atual) redirect(back);
  if (atual.status === status) {
    redirect(`${back}?saved=${encodeURIComponent("Status da oferta atualizado.")}`);
  }
  if (!(OFERTA_TRANSICOES[atual.status] ?? []).includes(status)) {
    redirect(
      `${back}?error=${encodeURIComponent(`Oferta ${atual.status} não pode mudar para ${status}.`)}`,
    );
  }

  const { data: updated, error } = await supabase
    .from("ofertas_comprador")
    .update({ status })
    .eq("id", idParsed.data)
    .eq("corretora_id", profile.corretora_id)
    .eq("status", atual.status)
    .select("id");

  if (error) {
    const log = await getReqLogger({
      action: "atualizarStatusOferta",
      corretoraId: profile.corretora_id,
      ofertaId: idParsed.data,
    });
    log.error("oferta_status_update_falhou", {
      to: status,
      code: error.code,
      err: safeError(error),
    });
    redirect(`${back}?error=${encodeURIComponent(friendlyPostgresError(error))}`);
  }
  if (!updated || updated.length === 0) {
    redirect(
      `${back}?error=${encodeURIComponent("Essa oferta já foi atualizada por outra ação. Recarregue.")}`,
    );
  }

  // Oferta de LOTE aceita = lote vendido (deal fechado). Best-effort; não mexe
  // em lote já vendido/arquivado.
  if (status === "aceita" && atual.lote_id) {
    await supabase
      .from("lotes")
      .update({ status: "vendido" })
      .eq("id", atual.lote_id)
      .eq("corretora_id", profile.corretora_id)
      .not("status", "in", "(vendido,arquivado)");
    revalidateAffected(`/painel/corretora/lotes/${atual.lote_id}`);
    revalidatePath("/painel/corretora/lotes");
  }

  revalidateAffected();
  redirect(`${back}?saved=${encodeURIComponent("Status da oferta atualizado.")}`);
}

export async function deleteOferta(formData: FormData) {
  const profile = await ensureCorretora();
  const back = safeBack(formData.get("redirect_to"));
  const idParsed = uuidSchema.safeParse(String(formData.get("id") ?? "").trim());
  if (!idParsed.success) redirect(back);

  const supabase = await createClient();

  // Não apaga oferta ACEITA — ela é a base de um negócio/contrato. Remover
  // deixaria o contrato órfão. Recusada/expirada/enviada podem ser limpas.
  const { data: atual } = await supabase
    .from("ofertas_comprador")
    .select("status")
    .eq("id", idParsed.data)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle<{ status: OfertaStatus }>();
  if (!atual) redirect(back);
  if (atual.status === "aceita") {
    redirect(
      `${back}?error=${encodeURIComponent("Oferta aceita não pode ser removida — ela virou negócio.")}`,
    );
  }

  const { error } = await supabase
    .from("ofertas_comprador")
    .delete()
    .eq("id", idParsed.data)
    .eq("corretora_id", profile.corretora_id);
  if (error) {
    const log = await getReqLogger({
      action: "deleteOferta",
      corretoraId: profile.corretora_id,
      ofertaId: idParsed.data,
    });
    log.error("oferta_delete_falhou", {
      code: error.code,
      err: safeError(error),
    });
  }

  revalidateAffected();
  redirect(`${back}?saved=${encodeURIComponent("Oferta removida.")}`);
}
