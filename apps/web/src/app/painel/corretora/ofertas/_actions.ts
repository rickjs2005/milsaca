"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { uuidSchema } from "../_lib/schemas";
import { requireActiveSubscription } from "../_lib/corretora";
import type { OfertaStatus } from "./_lib/queries";

const STATUS_VALIDOS: OfertaStatus[] = [
  "enviada",
  "aceita",
  "recusada",
  "expirada",
];

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
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
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
  const { error } = await supabase.from("ofertas_comprador").insert({
    corretora_id: profile.corretora_id,
    comprador_id: compradorParsed.data,
    lote_id: loteId,
    preco_saca: preco as number,
    bag_count: bagCount,
    validade_ate: validade,
    mensagem,
    status: "enviada",
    created_by: profile.id,
  });

  if (error) {
    redirect(`${back}?error=${encodeURIComponent(friendlyPostgresError(error))}`);
  }

  revalidateAffected(loteId ? `/painel/corretora/lotes/${loteId}` : undefined);
  redirect(`${back}?saved=${encodeURIComponent("Oferta registrada.")}`);
}

export async function atualizarStatusOferta(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const back = safeBack(formData.get("redirect_to"));
  const idParsed = uuidSchema.safeParse(String(formData.get("id") ?? "").trim());
  const status = String(formData.get("status") ?? "").trim() as OfertaStatus;
  if (!idParsed.success || !STATUS_VALIDOS.includes(status)) {
    redirect(back);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ofertas_comprador")
    .update({ status })
    .eq("id", idParsed.data)
    .eq("corretora_id", profile.corretora_id);

  if (error) {
    redirect(`${back}?error=${encodeURIComponent(friendlyPostgresError(error))}`);
  }

  revalidateAffected();
  redirect(`${back}?saved=${encodeURIComponent("Status da oferta atualizado.")}`);
}

export async function deleteOferta(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const back = safeBack(formData.get("redirect_to"));
  const idParsed = uuidSchema.safeParse(String(formData.get("id") ?? "").trim());
  if (!idParsed.success) redirect(back);

  const supabase = await createClient();
  await supabase
    .from("ofertas_comprador")
    .delete()
    .eq("id", idParsed.data)
    .eq("corretora_id", profile.corretora_id);

  revalidateAffected();
  redirect(`${back}?saved=${encodeURIComponent("Oferta removida.")}`);
}
