"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { requireActiveSubscription } from "../_lib/corretora";
import {
  CONTRATO_STATUS_ORDER,
  type ContratoStatus,
  nextContratoCode,
} from "./_lib/queries";

const CONTRATO_STATUS_LABEL: Record<ContratoStatus, string> = {
  rascunho: "em rascunho",
  em_analise: "em análise",
  ativo: "ativado",
  finalizado: "finalizado",
  cancelado: "cancelado",
};

function clean(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function parseInteger(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseDecimal(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Comissão é entrada simples: aceita "1.0", "1,0", "0,5" etc.
function parsePct(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

function calcComissaoTotal(
  totalValue: number | null,
  pct: number | null,
): number | null {
  if (totalValue == null || pct == null) return null;
  return Math.round(((totalValue * pct) / 100) * 100) / 100;
}

function isContratoStatus(v: string): v is ContratoStatus {
  return (CONTRATO_STATUS_ORDER as readonly string[]).includes(v);
}

function revalidateContrato(id?: string) {
  revalidatePath("/painel/corretora/contratos");
  revalidatePath("/painel/corretora");
  revalidatePath("/painel/produtor/contratos");
  revalidatePath("/painel/produtor");
  if (id) revalidatePath(`/painel/corretora/contratos/${id}`);
}

export async function createContrato(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/contratos",
  );

  const produtor_id = clean(formData.get("produtor_id"));
  const lead_id = clean(formData.get("lead_id"));
  const comprador_id = clean(formData.get("comprador_id"));
  const coffee_type = clean(formData.get("coffee_type"));
  const bag_count = parseInteger(formData.get("bag_count"));
  const total_value = parseDecimal(formData.get("total_value"));
  const comissao_pct = parsePct(formData.get("comissao_pct"));
  const comissao_total = calcComissaoTotal(total_value, comissao_pct);
  const code_input = clean(formData.get("code"));

  const errors: string[] = [];
  if (!produtor_id) errors.push("Produtor obrigatório");

  if (errors.length > 0) {
    const params = new URLSearchParams({ error: errors.join(", ") });
    if (lead_id) params.set("lead", lead_id);
    redirect(`/painel/corretora/contratos/novo?${params.toString()}`);
  }

  const code = code_input ?? (await nextContratoCode(profile.corretora_id));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contratos")
    .insert({
      corretora_id: profile.corretora_id,
      produtor_id: produtor_id as string,
      comprador_id,
      lead_id,
      code,
      status: "rascunho",
      coffee_type,
      bag_count,
      total_value,
      comissao_pct,
      comissao_total,
    })
    .select("id")
    .single();

  if (error || !data) {
    const params = new URLSearchParams({
      error: error?.message ?? "Falha ao criar contrato",
    });
    if (lead_id) params.set("lead", lead_id);
    redirect(`/painel/corretora/contratos/novo?${params.toString()}`);
  }

  await notify({
    userId: produtor_id as string,
    kind: "contrato",
    title: "Novo contrato em rascunho",
    body: `Contrato ${code} foi criado e aguarda revisão.`,
    data: {
      contrato_id: data.id,
      corretora_id: profile.corretora_id,
      code,
      href: `/painel/produtor/contratos/${data.id}`,
    },
  });

  revalidateContrato(data.id);
  redirect(`/painel/corretora/contratos/${data.id}`);
}

export async function updateContratoFields(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) redirect("/painel");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/painel/corretora/contratos");

  const code = clean(formData.get("code"));
  const comprador_id = clean(formData.get("comprador_id"));
  const coffee_type = clean(formData.get("coffee_type"));
  const bag_count = parseInteger(formData.get("bag_count"));
  const total_value = parseDecimal(formData.get("total_value"));
  const comissao_pct = parsePct(formData.get("comissao_pct"));
  const comissao_total = calcComissaoTotal(total_value, comissao_pct);

  if (!code) {
    const params = new URLSearchParams({ error: "Código obrigatório" });
    redirect(`/painel/corretora/contratos/${id}?${params.toString()}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contratos")
    .update({
      code: code as string,
      comprador_id,
      coffee_type,
      bag_count,
      total_value,
      comissao_pct,
      comissao_total,
    })
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id);

  if (error) {
    const params = new URLSearchParams({ error: error.message });
    redirect(`/painel/corretora/contratos/${id}?${params.toString()}`);
  }

  revalidateContrato(id);
  redirect(`/painel/corretora/contratos/${id}?saved=1`);
}

export async function updateContratoStatus(formData: FormData) {
  const profile = await getProfile();
  if (!profile?.corretora_id) redirect("/painel");

  const id = String(formData.get("id") ?? "").trim();
  const next = String(formData.get("status") ?? "").trim();
  if (!id || !isContratoStatus(next)) redirect("/painel/corretora/contratos");

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("contratos")
    .select("status, produtor_id, code")
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle();

  if (!current) redirect("/painel/corretora/contratos");

  const payload: { status: ContratoStatus; signed_at?: string | null } = {
    status: next,
  };
  // Quando vira ativo, registra signed_at (se ainda não houver)
  if (next === "ativo") {
    payload.signed_at = new Date().toISOString();
  }
  if (next === "rascunho" || next === "em_analise" || next === "cancelado") {
    payload.signed_at = null;
  }

  const { error } = await supabase
    .from("contratos")
    .update(payload)
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id);

  if (error) {
    const params = new URLSearchParams({ error: error.message });
    redirect(`/painel/corretora/contratos/${id}?${params.toString()}`);
  }

  if (current.status !== next) {
    await notify({
      userId: current.produtor_id,
      kind: "contrato",
      title: `Contrato ${CONTRATO_STATUS_LABEL[next as ContratoStatus]}`,
      body: current.code ? `Contrato ${current.code}` : null,
      data: {
        contrato_id: id,
        corretora_id: profile.corretora_id,
        from: current.status,
        to: next,
        href: `/painel/produtor/contratos/${id}`,
      },
    });
  }

  revalidateContrato(id);
  redirect(`/painel/corretora/contratos/${id}?saved=1`);
}
