"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import type { Json } from "@milsaca/types/database";
import { CONTRATO_VERSAO } from "@/lib/legal";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import { notify } from "@/lib/notify";
import { ensureCorretora, requireActiveSubscription } from "../_lib/corretora";
import {
  CONTRATO_STATUS_ORDER,
  type ContratoStatus,
  nextContratoCode,
} from "./_lib/queries";

// Auditoria best-effort: a RPC log_audit (SECURITY DEFINER) carimba
// actor_id=auth.uid() e corretora_id server-side. Nunca derruba a mutação
// principal — falha de auditoria é engolida de propósito.
async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  action: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.rpc("log_audit", {
      p_action: action,
      p_entity: "contrato",
      p_entity_id: entityId,
      p_payload: payload as Json,
    });
  } catch (e) {
    // auditoria é best-effort; nunca derruba a operação de negócio.
    const log = await getReqLogger({ action, entityId });
    log.warn("audit_best_effort_falhou", { err: safeError(e) });
  }
}

/**
 * SHA-256 (hex) do payload canônico do contrato. O payload é serializado
 * com as chaves ORDENADAS ALFABETICAMENTE de forma determinística (não
 * depende da ordem em que os campos são listados no código) e inclui a
 * CONTRATO_VERSAO. Assim o mesmo contrato produz sempre o mesmo hash —
 * base da verificação pública (achado 7.1/7.2 da auditoria).
 *
 * ATENÇÃO: incluir CONTRATO_VERSAO e mudar a serialização altera o hash
 * de contratos FUTUROS. Contratos JÁ ASSINADOS mantêm o content_hash
 * gravado no banco — não há recálculo retroativo, e nem deve haver
 * (o hash congela o documento no momento da assinatura).
 */
function contratoContentHash(input: {
  code: string | null;
  produtor_id: string | null;
  comprador_id: string | null;
  coffee_type: string | null;
  bag_count: number | null;
  total_value: number | null;
  comissao_pct: number | null;
  comissao_total: number | null;
  signed_at: string | null;
}): string {
  // Payload completo, incluindo a versão do modelo de contrato.
  const payload: Record<string, unknown> = {
    contrato_versao: CONTRATO_VERSAO,
    code: input.code,
    produtor_id: input.produtor_id,
    comprador_id: input.comprador_id,
    coffee_type: input.coffee_type,
    bag_count: input.bag_count,
    total_value: input.total_value,
    comissao_pct: input.comissao_pct,
    comissao_total: input.comissao_total,
    signed_at: input.signed_at,
  };
  // Serializa com as chaves em ordem alfabética estável — reproduzível
  // independentemente da ordem em que os campos foram declarados acima.
  const canonical = JSON.stringify(
    Object.keys(payload)
      .sort()
      .map((key) => [key, payload[key]]),
  );
  return createHash("sha256").update(canonical).digest("hex");
}

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
  const profile = await ensureCorretora();
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
    const log = await getReqLogger({
      action: "createContrato",
      corretoraId: profile.corretora_id,
    });
    log.error("contrato_insert_falhou", {
      code: error?.code,
      err: error ? safeError(error) : { message: "insert sem retorno" },
    });
    const params = new URLSearchParams({
      error: error?.message ?? "Falha ao criar contrato",
    });
    if (lead_id) params.set("lead", lead_id);
    redirect(`/painel/corretora/contratos/novo?${params.toString()}`);
  }

  await logAudit(supabase, "contrato_create", data.id, {
    code,
    produtor_id,
    comprador_id,
    coffee_type,
    bag_count,
    total_value,
    comissao_pct,
    comissao_total,
  });

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

  // Amarra lead -> contrato: gerar contrato a partir de um lead CONVERTE o
  // lead (que passa a ser terminal). Best-effort — não derruba a criação do
  // contrato se falhar; o `neq` evita re-evento se já estava convertido.
  if (lead_id) {
    const { error: leadErr } = await supabase
      .from("leads")
      .update({ status: "convertido" })
      .eq("id", lead_id)
      .eq("corretora_id", profile.corretora_id)
      .neq("status", "convertido");
    if (leadErr) {
      const log = await getReqLogger({
        action: "createContrato",
        corretoraId: profile.corretora_id,
      });
      log.warn("lead_convertido_falhou", {
        leadId: lead_id,
        code: leadErr.code,
        err: safeError(leadErr),
      });
    }
    revalidatePath("/painel/corretora/leads");
    revalidatePath(`/painel/corretora/leads/${lead_id}`);
  }

  revalidateContrato(data.id);
  redirect(`/painel/corretora/contratos/${data.id}`);
}

export async function updateContratoFields(formData: FormData) {
  const profile = await ensureCorretora();

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

  // Guard de imutabilidade: TODOS os campos editáveis aqui (code, comprador_id,
  // coffee_type, bag_count, total_value, comissao_pct, comissao_total) entram
  // no contratoContentHash. Após a assinatura (status ativo/finalizado) o
  // content_hash já foi CONGELADO em updateContratoStatus e não é recalculado.
  // Editar agora produziria divergência entre os valores e o hash, quebrando o
  // espelho e a verificação pública. Não há campo puramente interno nesta
  // action, então recusamos o update inteiro.
  const { data: existing } = await supabase
    .from("contratos")
    .select("status")
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle<{ status: ContratoStatus }>();

  if (!existing) redirect("/painel/corretora/contratos");

  if (existing.status === "ativo" || existing.status === "finalizado") {
    const log = await getReqLogger({
      action: "updateContratoFields",
      corretoraId: profile.corretora_id,
      contratoId: id,
    });
    log.warn("contrato_edit_assinado_bloqueado", { status: existing.status });
    const params = new URLSearchParams({
      error:
        "Contrato assinado não pode ser editado. Cancele e refaça se necessário.",
    });
    redirect(`/painel/corretora/contratos/${id}?${params.toString()}`);
  }

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
    const params = new URLSearchParams({ error: friendlyPostgresError(error) });
    redirect(`/painel/corretora/contratos/${id}?${params.toString()}`);
  }

  await logAudit(supabase, "contrato_update_fields", id, {
    code,
    comprador_id,
    coffee_type,
    bag_count,
    total_value,
    comissao_pct,
    comissao_total,
  });

  revalidateContrato(id);
  redirect(`/painel/corretora/contratos/${id}?saved=1`);
}

export async function updateContratoStatus(formData: FormData) {
  const profile = await ensureCorretora();
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/contratos",
  );

  const id = String(formData.get("id") ?? "").trim();
  const next = String(formData.get("status") ?? "").trim();
  if (!id || !isContratoStatus(next)) redirect("/painel/corretora/contratos");

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("contratos")
    .select(
      `status, produtor_id, code, comprador_id, coffee_type, bag_count,
       total_value, comissao_pct, comissao_total`,
    )
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle<{
      status: ContratoStatus;
      produtor_id: string;
      code: string | null;
      comprador_id: string | null;
      coffee_type: string | null;
      bag_count: number | null;
      total_value: number | string | null;
      comissao_pct: number | string | null;
      comissao_total: number | string | null;
    }>();

  if (!current) redirect("/painel/corretora/contratos");

  // Guard de conservação de sacas (achado-raiz da auditoria): não dá pra
  // FINALIZAR um contrato deixando sacas sem entrega registrada. Soma as
  // entregas não-canceladas e compara com o contratado; se faltar, recusa e
  // mostra o saldo pendente em vez de "sumir" com as sacas.
  if (next === "finalizado" && current.bag_count != null && current.bag_count > 0) {
    const { data: entregas } = await supabase
      .from("entregas")
      .select("bag_count, status")
      .eq("corretora_id", profile.corretora_id)
      .eq("contrato_id", id)
      .neq("status", "cancelada");
    const registrado = (entregas ?? []).reduce(
      (acc, e) => acc + (e.bag_count ?? 0),
      0,
    );
    const pendente = current.bag_count - registrado;
    if (pendente > 0) {
      const log = await getReqLogger({
        action: "updateContratoStatus",
        corretoraId: profile.corretora_id,
        contratoId: id,
      });
      log.warn("contrato_finalizar_com_saldo_pendente", {
        contratado: current.bag_count,
        registrado,
        pendente,
      });
      const params = new URLSearchParams({
        error: `Não dá pra finalizar: faltam ${pendente} sacas sem entrega registrada (contratado ${current.bag_count}, registrado ${registrado}). Registre a entrega ou ajuste o contrato.`,
      });
      redirect(`/painel/corretora/contratos/${id}?${params.toString()}`);
    }
  }

  const payload: {
    status: ContratoStatus;
    signed_at?: string | null;
    content_hash?: string | null;
  } = {
    status: next,
  };
  // Quando vira ativo (assinado), registra signed_at e congela o
  // content_hash: SHA-256 do payload canônico no momento da assinatura.
  if (next === "ativo") {
    const signedAt = new Date().toISOString();
    payload.signed_at = signedAt;
    payload.content_hash = contratoContentHash({
      code: current.code,
      produtor_id: current.produtor_id,
      comprador_id: current.comprador_id,
      coffee_type: current.coffee_type,
      bag_count: current.bag_count,
      total_value:
        current.total_value != null ? Number(current.total_value) : null,
      comissao_pct:
        current.comissao_pct != null ? Number(current.comissao_pct) : null,
      comissao_total:
        current.comissao_total != null
          ? Number(current.comissao_total)
          : null,
      signed_at: signedAt,
    });
  }
  // Voltar a estados não-assinados limpa signed_at e o hash (deixa de
  // ser um documento congelado).
  if (next === "rascunho" || next === "em_analise" || next === "cancelado") {
    payload.signed_at = null;
    payload.content_hash = null;
  }

  const { error } = await supabase
    .from("contratos")
    .update(payload)
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id);

  if (error) {
    const log = await getReqLogger({
      action: "updateContratoStatus",
      corretoraId: profile.corretora_id,
      contratoId: id,
    });
    // Transição → ativo é a assinatura (grava signed_at/content_hash);
    // separa o evento pra facilitar alerta.
    log.error(
      next === "ativo"
        ? "contrato_assinatura_falhou"
        : "contrato_status_update_falhou",
      { from: current.status, to: next, code: error.code, err: safeError(error) },
    );
    const params = new URLSearchParams({ error: friendlyPostgresError(error) });
    redirect(`/painel/corretora/contratos/${id}?${params.toString()}`);
  }

  await logAudit(supabase, "contrato_update_status", id, {
    from: current.status,
    to: next,
    signed_at: payload.signed_at ?? null,
    content_hash: payload.content_hash ?? null,
  });

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
