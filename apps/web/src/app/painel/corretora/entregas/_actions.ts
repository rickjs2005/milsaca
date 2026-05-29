"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import { friendlyPostgresError } from "@/lib/postgres-error";
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

// Detecta violação da unique (contrato_id, sequencia) — Postgres 23505.
function isUniqueViolation(error: PostgrestError | null): boolean {
  if (!error) return false;
  return (
    error.code === "23505" ||
    /duplicate key|unique constraint/i.test(error.message ?? "")
  );
}

/**
 * Insere uma entrega calculando a próxima sequência do contrato, com
 * retry-on-conflict (achado 2.7). O cálculo do max + insert não é atômico,
 * então duas entregas simultâneas podiam tentar a mesma sequencia e bater
 * na unique (contrato_id, sequencia). Em vez de read-lock, recomputamos o
 * próximo número e tentamos de novo (até 3x).
 *
 * Retorna { id } no sucesso, ou { error } no insucesso (não-conflito ou
 * esgotou as tentativas) — o chamador trata o redirect.
 */
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
async function insertEntregaWithSequence(
  supabase: SupabaseClient,
  base: Record<string, unknown>,
  contratoId: string,
): Promise<{ id: string; sequencia: number } | { error: PostgrestError | null }> {
  let lastError: PostgrestError | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: existing } = await supabase
      .from("entregas")
      .select("sequencia")
      .eq("contrato_id", contratoId)
      .order("sequencia", { ascending: false })
      .limit(1);
    const nextSeq = ((existing?.[0]?.sequencia as number | undefined) ?? 0) + 1;

    const { data: novo, error } = await supabase
      .from("entregas")
      .insert({ ...base, contrato_id: contratoId, sequencia: nextSeq })
      .select("id")
      .single();

    if (!error && novo) {
      return { id: (novo as { id: string }).id, sequencia: nextSeq };
    }
    lastError = error;
    if (!isUniqueViolation(error)) break; // erro real — não adianta retry
    // Conflito de sequencia: outra entrega chegou primeiro. Recomputa e tenta.
  }
  return { error: lastError };
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

  const bag_count = parseInt0(formData.get("bag_count"));
  const data_prevista = parseDate(formData.get("data_prevista"));

  // Sequência atômica com retry-on-conflict (achado 2.7).
  const result = await insertEntregaWithSequence(
    supabase,
    {
      corretora_id: profile.corretora_id,
      produtor_id: contrato.produtor_id,
      bag_count,
      data_prevista,
      local_retirada:
        String(formData.get("local_retirada") ?? "").trim() || null,
      transportadora_nome:
        String(formData.get("transportadora_nome") ?? "").trim() || null,
      observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    },
    contratoId,
  );

  if ("error" in result) {
    redirect(
      `/painel/corretora/entregas/nova?contrato=${contratoId}&error=${encodeURIComponent(friendlyPostgresError(result.error, "Erro ao criar entrega"))}`,
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
      entrega_id: result.id,
      contrato_id: contratoId,
      corretora_id: profile.corretora_id,
      sequencia: result.sequencia,
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
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/entregas",
  );
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

  // Sequência atômica com retry-on-conflict (achado 2.7).
  const result = await insertEntregaWithSequence(
    supabase,
    {
      corretora_id: profile.corretora_id,
      produtor_id: contrato.produtor_id,
      bag_count: contrato.bag_count ?? null,
    },
    contratoId,
  );

  if ("error" in result) {
    redirect(
      `/painel/corretora/contratos/${contratoId}?error=${encodeURIComponent(friendlyPostgresError(result.error, "Erro ao gerar entrega"))}`,
    );
  }

  await notify({
    userId: contrato.produtor_id,
    kind: "entrega",
    title: "Entrega programada",
    body: contrato.bag_count != null ? `${contrato.bag_count} sacas` : null,
    data: {
      entrega_id: result.id,
      contrato_id: contratoId,
      corretora_id: profile.corretora_id,
      sequencia: result.sequencia,
      href: `/painel/produtor/entregas`,
    },
  });

  revalidatePath(`/painel/corretora/contratos/${contratoId}`);
  revalidatePath("/painel/corretora/entregas");
  redirect(`/painel/corretora/entregas/${result.id}?saved=1`);
}

export async function updateEntregaStatus(formData: FormData) {
  const profile = await ensureCorretora();
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/entregas",
  );
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
