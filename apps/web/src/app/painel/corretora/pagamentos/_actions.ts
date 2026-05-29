"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { uuidSchema } from "../_lib/schemas";
import { requireActiveSubscription } from "../_lib/corretora";

function parseBRL(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function revalidateAffected() {
  revalidatePath("/painel/corretora/pagamentos");
  revalidatePath("/painel/produtor/financeiro");
  revalidatePath("/painel/produtor");
}

/**
 * Cria um registro de pagamento ao produtor a partir de um contrato.
 * É CONTROLE — não movimenta dinheiro nem guarda dado bancário. O produtor
 * passa a ver "a receber" no Financeiro dele. valor_liquido = bruto - descontos.
 */
export async function createPagamento(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/pagamentos",
  );

  const contratoParsed = uuidSchema.safeParse(
    String(formData.get("contrato_id") ?? "").trim(),
  );
  const valorBruto = parseBRL(formData.get("valor_bruto"));
  const descontos = parseBRL(formData.get("descontos")) ?? 0;
  const dataPrevista =
    String(formData.get("data_prevista") ?? "").trim() || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  const back = "/painel/corretora/pagamentos/novo";
  const errors: string[] = [];
  if (!contratoParsed.success) errors.push("Selecione um contrato");
  if (valorBruto == null || valorBruto <= 0) errors.push("Valor bruto inválido");
  if (descontos < 0) errors.push("Descontos inválidos");
  if (valorBruto != null && descontos > valorBruto)
    errors.push("Descontos maiores que o valor bruto");
  if (errors.length > 0) {
    redirect(`${back}?error=${encodeURIComponent(errors.join(", "))}`);
  }

  const supabase = await createClient();

  // Deriva o produtor do contrato (e confirma que é da corretora).
  const { data: contrato } = await supabase
    .from("contratos")
    .select("id, produtor_id")
    .eq("id", contratoParsed.data)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle<{ id: string; produtor_id: string }>();
  if (!contrato) {
    redirect(`${back}?error=${encodeURIComponent("Contrato não encontrado.")}`);
  }

  const bruto = valorBruto as number;
  const liquido = bruto - descontos;

  const { error } = await supabase.from("produtor_pagamentos").insert({
    corretora_id: profile.corretora_id,
    produtor_id: contrato.produtor_id,
    contrato_id: contrato.id,
    valor_bruto: bruto,
    valor_liquido: liquido,
    descontos: descontos > 0 ? { total: descontos } : {},
    status: "pendente",
    data_prevista: dataPrevista,
    observacoes,
  });

  if (error) {
    redirect(`${back}?error=${encodeURIComponent(friendlyPostgresError(error))}`);
  }

  revalidateAffected();
  redirect(
    "/painel/corretora/pagamentos?saved=" +
      encodeURIComponent("Pagamento registrado."),
  );
}

/**
 * Marca um pagamento como pago (data_paga = hoje). Só registro/controle.
 */
export async function marcarPago(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const idParsed = uuidSchema.safeParse(String(formData.get("id") ?? "").trim());
  if (!idParsed.success) redirect("/painel/corretora/pagamentos");
  const comprovante =
    String(formData.get("comprovante_url") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("produtor_pagamentos")
    .update({
      status: "pago",
      data_paga: new Date().toISOString().slice(0, 10),
      comprovante_url: comprovante,
    })
    .eq("id", idParsed.data)
    .eq("corretora_id", profile.corretora_id);

  if (error) {
    redirect(
      `/painel/corretora/pagamentos?error=${encodeURIComponent(friendlyPostgresError(error))}`,
    );
  }

  revalidateAffected();
  redirect(
    "/painel/corretora/pagamentos?saved=" +
      encodeURIComponent("Pagamento marcado como pago."),
  );
}

/**
 * Cancela um registro de pagamento (status = cancelado). Não apaga histórico.
 */
export async function cancelarPagamento(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const idParsed = uuidSchema.safeParse(String(formData.get("id") ?? "").trim());
  if (!idParsed.success) redirect("/painel/corretora/pagamentos");

  const supabase = await createClient();
  await supabase
    .from("produtor_pagamentos")
    .update({ status: "cancelado" })
    .eq("id", idParsed.data)
    .eq("corretora_id", profile.corretora_id);

  revalidateAffected();
  redirect(
    "/painel/corretora/pagamentos?saved=" +
      encodeURIComponent("Pagamento cancelado."),
  );
}
