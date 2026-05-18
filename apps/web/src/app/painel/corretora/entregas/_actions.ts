"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { requireActiveSubscription } from "../_lib/corretora";
import type { EntregaStatus } from "./_lib/queries";

const ENTREGA_STATUS_LABEL: Record<EntregaStatus, string> = {
  programada: "programada",
  em_transito: "em trânsito",
  recebida: "recebida",
  conferida: "conferida",
  cancelada: "cancelada",
};

function parseNum(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseInt0(v: FormDataEntryValue | null): number | null {
  const n = parseNum(v);
  return n != null ? Math.round(n) : null;
}

function parseDate(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

async function ensureCorretora() {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  return profile as typeof profile & { corretora_id: string };
}

export async function createEntrega(formData: FormData) {
  const profile = await ensureCorretora();
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/entregas",
  );
  const supabase = await createClient();

  const contratoId = String(formData.get("contrato_id") ?? "");
  if (!contratoId) {
    redirect("/painel/corretora/entregas/nova?error=Contrato%20obrigat%C3%B3rio");
  }

  // Pega produtor_id + sequência atual do contrato
  const { data: contrato } = await supabase
    .from("contratos")
    .select("produtor_id")
    .eq("corretora_id", profile.corretora_id)
    .eq("id", contratoId)
    .maybeSingle();

  if (!contrato) {
    redirect("/painel/corretora/entregas/nova?error=Contrato%20n%C3%A3o%20encontrado");
  }

  const { data: existing } = await supabase
    .from("entregas")
    .select("sequencia")
    .eq("contrato_id", contratoId)
    .order("sequencia", { ascending: false })
    .limit(1);
  const nextSeq = ((existing?.[0]?.sequencia as number | undefined) ?? 0) + 1;

  const bag_count = parseInt0(formData.get("bag_count"));
  const data_prevista = parseDate(formData.get("data_prevista"));

  const { data: novo, error } = await supabase
    .from("entregas")
    .insert({
      corretora_id: profile.corretora_id,
      contrato_id: contratoId,
      produtor_id: contrato.produtor_id,
      sequencia: nextSeq,
      bag_count,
      data_prevista,
      local_retirada:
        String(formData.get("local_retirada") ?? "").trim() || null,
      transportadora_nome:
        String(formData.get("transportadora_nome") ?? "").trim() || null,
      observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    })
    .select("id")
    .single();

  if (error || !novo) {
    redirect(
      `/painel/corretora/entregas/nova?contrato=${contratoId}&error=${encodeURIComponent(error?.message ?? "Erro ao criar entrega")}`,
    );
  }

  await notify({
    userId: contrato.produtor_id,
    kind: "entrega",
    title: "Entrega programada",
    body:
      [
        bag_count != null ? `${bag_count} sacas` : null,
        data_prevista ? `prevista para ${data_prevista}` : null,
      ]
        .filter(Boolean)
        .join(" — ") || null,
    data: {
      entrega_id: novo.id,
      contrato_id: contratoId,
      corretora_id: profile.corretora_id,
      sequencia: nextSeq,
      href: `/painel/produtor/entregas`,
    },
  });

  revalidatePath("/painel/corretora/entregas");
  revalidatePath("/painel/corretora");
  redirect("/painel/corretora/entregas?ok=Entrega%20criada");
}

// Atalho do detalhe do contrato — gera 1 entrega única com sacas = contrato.bag_count
export async function gerarEntregaDoContrato(formData: FormData) {
  const profile = await ensureCorretora();
  const supabase = await createClient();
  const contratoId = String(formData.get("contrato_id") ?? "");
  if (!contratoId) return;

  const { data: contrato } = await supabase
    .from("contratos")
    .select("produtor_id, bag_count")
    .eq("corretora_id", profile.corretora_id)
    .eq("id", contratoId)
    .maybeSingle();
  if (!contrato) return;

  const { data: existing } = await supabase
    .from("entregas")
    .select("sequencia")
    .eq("contrato_id", contratoId)
    .order("sequencia", { ascending: false })
    .limit(1);
  const nextSeq = ((existing?.[0]?.sequencia as number | undefined) ?? 0) + 1;

  const { data: novo, error } = await supabase
    .from("entregas")
    .insert({
      corretora_id: profile.corretora_id,
      contrato_id: contratoId,
      produtor_id: contrato.produtor_id,
      sequencia: nextSeq,
      bag_count: contrato.bag_count ?? null,
    })
    .select("id")
    .single();

  if (error || !novo) {
    redirect(
      `/painel/corretora/contratos/${contratoId}?error=${encodeURIComponent(error?.message ?? "Erro ao gerar entrega")}`,
    );
  }

  await notify({
    userId: contrato.produtor_id,
    kind: "entrega",
    title: "Entrega programada",
    body: contrato.bag_count != null ? `${contrato.bag_count} sacas` : null,
    data: {
      entrega_id: novo.id,
      contrato_id: contratoId,
      corretora_id: profile.corretora_id,
      sequencia: nextSeq,
      href: `/painel/produtor/entregas`,
    },
  });

  revalidatePath(`/painel/corretora/contratos/${contratoId}`);
  revalidatePath("/painel/corretora/entregas");
  redirect(`/painel/corretora/entregas/${novo.id}?saved=1`);
}

export async function updateEntregaStatus(formData: FormData) {
  const profile = await ensureCorretora();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as EntregaStatus;
  if (!id || !status) return;

  const { data: current } = await supabase
    .from("entregas")
    .select("status, produtor_id, sequencia, contrato_id")
    .eq("corretora_id", profile.corretora_id)
    .eq("id", id)
    .maybeSingle();

  if (!current) return;

  const patch: {
    status: EntregaStatus;
    data_realizada?: string;
  } = { status };
  if (status === "recebida" || status === "conferida") {
    patch.data_realizada = new Date().toISOString().slice(0, 10);
  }

  await supabase
    .from("entregas")
    .update(patch)
    .eq("corretora_id", profile.corretora_id)
    .eq("id", id);

  if (current.status !== status) {
    await notify({
      userId: current.produtor_id,
      kind: "entrega",
      title: `Entrega ${ENTREGA_STATUS_LABEL[status]}`,
      body: `Entrega #${current.sequencia}`,
      data: {
        entrega_id: id,
        contrato_id: current.contrato_id,
        corretora_id: profile.corretora_id,
        from: current.status,
        to: status,
        href: `/painel/produtor/entregas`,
      },
    });
  }

  revalidatePath("/painel/corretora/entregas");
  revalidatePath(`/painel/corretora/entregas/${id}`);
  revalidatePath("/painel/corretora");
  redirect(`/painel/corretora/entregas/${id}?saved=1`);
}

export async function updateEntregaFields(formData: FormData) {
  const profile = await ensureCorretora();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const bruto = parseNum(formData.get("peso_bruto_kg"));
  const tara = parseNum(formData.get("peso_tara_kg"));
  let liquido = parseNum(formData.get("peso_liquido_kg"));
  if (liquido == null && bruto != null && tara != null) liquido = bruto - tara;

  await supabase
    .from("entregas")
    .update({
      bag_count: parseInt0(formData.get("bag_count")),
      data_prevista: parseDate(formData.get("data_prevista")),
      data_realizada: parseDate(formData.get("data_realizada")),
      local_retirada:
        String(formData.get("local_retirada") ?? "").trim() || null,
      transportadora_nome:
        String(formData.get("transportadora_nome") ?? "").trim() || null,
      transportadora_doc:
        String(formData.get("transportadora_doc") ?? "").trim() || null,
      peso_bruto_kg: bruto,
      peso_tara_kg: tara,
      peso_liquido_kg: liquido,
      umidade_pct: parseNum(formData.get("umidade_pct")),
      observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    })
    .eq("corretora_id", profile.corretora_id)
    .eq("id", id);

  revalidatePath("/painel/corretora/entregas");
  revalidatePath(`/painel/corretora/entregas/${id}`);
  redirect(`/painel/corretora/entregas/${id}?saved=1`);
}
