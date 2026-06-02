"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import type { Json } from "@milsaca/types/database";
import { getUser } from "@/lib/auth";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import { notify } from "@/lib/notify";
import { ensureCorretora, requireActiveSubscription } from "../_lib/corretora";
import {
  PROPOSTA_STATUS_ORDER,
  type PropostaStatus,
} from "./_lib/proposta-meta";

function clean(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function parseNumber(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v)
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseInteger(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseDateTime(v: FormDataEntryValue | null): string | null {
  const s = clean(v);
  if (!s) return null;
  // input type="date" devolve YYYY-MM-DD — converte pra fim do dia em UTC
  // (validade vence no fim do dia escolhido, não no início)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return `${s}T23:59:59.000Z`;
  }
  // input type="datetime-local" devolve YYYY-MM-DDTHH:mm — anexa offset
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
    return `${s}:00.000Z`;
  }
  return s;
}

function isPropostaStatus(v: string): v is PropostaStatus {
  return (PROPOSTA_STATUS_ORDER as readonly string[]).includes(v);
}

/**
 * Texto curto pra timeline/notificação do produtor.
 * Ex.: "Proposta: R$ 1.450,00/saca · 100 sacas".
 */
function formatPropostaResumo(
  preco_saca: number,
  bag_count: number | null,
): string {
  const preco = preco_saca.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  });
  let s = `Proposta: R$ ${preco}/saca`;
  if (bag_count != null) {
    s += ` · ${bag_count.toLocaleString("pt-BR")} sacas`;
  }
  return s;
}

/**
 * Resolve qual path revalidar baseado em qual alvo a proposta tem.
 * Sempre revalida o painel (KPIs).
 */
function revalidateProposta(opts: {
  leadId?: string | null;
  loteId?: string | null;
}) {
  revalidatePath("/painel/corretora");
  if (opts.leadId) {
    revalidatePath(`/painel/corretora/leads/${opts.leadId}`);
    revalidatePath("/painel/corretora/leads");
  }
  if (opts.loteId) {
    revalidatePath(`/painel/corretora/lotes/${opts.loteId}`);
    revalidatePath("/painel/corretora/lotes");
  }
}

/**
 * Cria proposta amarrada a um lead OU lote (pelo menos um).
 * Aceita campos vindos do form do detalhe — preço obrigatório.
 *
 * Default status = "enviada" porque o fluxo da UI hoje cria já enviando.
 * Rascunho fica pra implementação futura de "salvar pra mandar depois".
 */
export async function createProposta(formData: FormData) {
  const profile = await ensureCorretora();
  const user = await getUser();
  if (!user) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/leads",
  );

  const leadId = clean(formData.get("lead_id"));
  const loteId = clean(formData.get("lote_id"));
  const preco_saca = parseNumber(formData.get("preco_saca"));
  const bag_count = parseInteger(formData.get("bag_count"));
  const mensagem = clean(formData.get("mensagem"));
  const validade_ate = parseDateTime(formData.get("validade_ate"));

  const errors: string[] = [];
  if (!leadId && !loteId) errors.push("Vincule a um lead ou lote");
  if (preco_saca == null) errors.push("Informe o preço por saca");

  // pra redirecionar de volta pro lugar certo, usa a primeira FK que veio
  const backHref = leadId
    ? `/painel/corretora/leads/${leadId}`
    : loteId
      ? `/painel/corretora/lotes/${loteId}`
      : "/painel/corretora";

  if (errors.length > 0) {
    const params = new URLSearchParams({ error: errors.join(", ") });
    redirect(`${backHref}?${params.toString()}`);
  }

  const supabase = await createClient();

  // Lead convertido (já virou contrato) é terminal: não dá pra enviar proposta
  // nova num negócio fechado. Trava no servidor (a UI também esconde o form).
  if (leadId) {
    const { data: leadRow } = await supabase
      .from("leads")
      .select("status")
      .eq("id", leadId)
      .eq("corretora_id", profile.corretora_id)
      .maybeSingle<{ status: string }>();
    if (leadRow?.status === "convertido") {
      redirect(
        `${backHref}?error=${encodeURIComponent("Lead convertido (já virou contrato) — não dá pra enviar nova proposta.")}`,
      );
    }
  }

  const { error } = await supabase.from("propostas").insert({
    corretora_id: profile.corretora_id,
    lead_id: leadId,
    lote_id: loteId,
    // validado acima: preco_saca == null vira erro e redireciona
    preco_saca: preco_saca!,
    bag_count,
    mensagem,
    validade_ate,
    status: "enviada" as PropostaStatus,
    enviada_em: new Date().toISOString(),
    created_by: user.id,
  });

  if (error) {
    const log = await getReqLogger({
      action: "createProposta",
      corretoraId: profile.corretora_id,
      leadId,
      loteId,
    });
    log.error("proposta_insert_falhou", {
      code: error.code,
      err: safeError(error),
    });
    const params = new URLSearchParams({ error: friendlyPostgresError(error) });
    redirect(`${backHref}?${params.toString()}`);
  }

  // Proposta amarrada a um lead → torna visível pro produtor (achado ALTA 6):
  // a tabela propostas é owner-only (RLS), então o produtor não a lê. Espelha
  // createLead/updateLeadStatus: grava um lead_event (timeline) e notifica o
  // produtor. Tudo best-effort — não derruba o sucesso da criação da proposta.
  // (Sem lead_id, ex.: proposta direta de lote, não há timeline de produtor.)
  if (leadId) {
    // preco_saca já é não-nulo aqui (validado acima), mas o TS não sabe.
    const resumo = formatPropostaResumo(preco_saca ?? 0, bag_count);

    // kind "comment": é o evento que o timeline do produtor já renderiza
    // com texto livre (payload.text). Não há kind "proposta_enviada" exibido
    // lá, então usar "comment" garante que o produtor VEJA a proposta.
    const { error: eventErr } = await supabase.from("lead_events").insert({
      lead_id: leadId,
      corretora_id: profile.corretora_id,
      actor_id: user.id,
      kind: "comment",
      payload: { text: resumo } as unknown as Json,
    });
    if (eventErr) {
      const log = await getReqLogger({
        action: "createProposta",
        corretoraId: profile.corretora_id,
        leadId,
      });
      log.warn("lead_event_insert_falhou", {
        kind: "comment",
        code: eventErr.code,
        err: safeError(eventErr),
      });
    }

    // Busca o produtor do lead pra notificar (a action não tem em mãos).
    const { data: leadRow } = await supabase
      .from("leads")
      .select("produtor_id")
      .eq("id", leadId)
      .eq("corretora_id", profile.corretora_id)
      .maybeSingle();

    if (leadRow?.produtor_id) {
      await notify({
        userId: leadRow.produtor_id,
        kind: "lead",
        title: "Nova proposta da corretora",
        body: resumo,
        data: {
          lead_id: leadId,
          corretora_id: profile.corretora_id,
          href: `/painel/produtor/negociacoes/${leadId}`,
        },
      });
    }
  }

  revalidateProposta({ leadId, loteId });
  redirect(`${backHref}?saved=Proposta%20enviada`);
}

/**
 * Atualiza apenas o status (e respondida_em quando vira aceita/rejeitada/expirada).
 */
export async function updatePropostaStatus(formData: FormData) {
  const profile = await ensureCorretora();
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/leads",
  );

  const id = String(formData.get("id") ?? "").trim();
  const next = String(formData.get("status") ?? "").trim();
  if (!id || !isPropostaStatus(next)) redirect("/painel/corretora");

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("propostas")
    .select("lead_id, lote_id, status")
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle();

  if (!current) redirect("/painel/corretora");

  const c = current as {
    lead_id: string | null;
    lote_id: string | null;
    status: PropostaStatus;
  };

  const isTerminal =
    next === "aceita" || next === "rejeitada" || next === "expirada";

  const update: {
    status: PropostaStatus;
    respondida_em?: string | null;
    enviada_em?: string;
  } = { status: next as PropostaStatus };
  if (isTerminal) {
    update.respondida_em = new Date().toISOString();
  }
  if (next === "enviada" && c.status === "rascunho") {
    update.enviada_em = new Date().toISOString();
  }

  // Compare-and-set (achado 2.4): a transição só aplica se o status no
  // banco ainda é o que lemos (c.status). Se outra ação já respondeu a
  // proposta nesse meio-tempo, 0 linhas voltam e avisamos sem erro feio.
  const { data: updated, error } = await supabase
    .from("propostas")
    .update(update)
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id)
    .eq("status", c.status)
    .select("id");

  const backHref = c.lead_id
    ? `/painel/corretora/leads/${c.lead_id}`
    : c.lote_id
      ? `/painel/corretora/lotes/${c.lote_id}`
      : "/painel/corretora";

  if (error) {
    const log = await getReqLogger({
      action: "updatePropostaStatus",
      corretoraId: profile.corretora_id,
      propostaId: id,
    });
    log.error("proposta_status_update_falhou", {
      from: c.status,
      to: next,
      code: error.code,
      err: safeError(error),
    });
    const params = new URLSearchParams({ error: friendlyPostgresError(error) });
    redirect(`${backHref}?${params.toString()}`);
  }

  if (!updated || updated.length === 0) {
    redirect(
      `${backHref}?error=${encodeURIComponent("Essa proposta já foi respondida por outra ação. Atualize a página.")}`,
    );
  }

  // Aceite move o lead 'novo' -> 'em_negociacao' (negociação ativa). A conversão
  // de verdade é só ao gerar o contrato — não pula pra convertido aqui.
  // Best-effort: nunca derruba o sucesso da resposta da proposta.
  if (next === "aceita" && c.lead_id) {
    const { error: leadErr } = await supabase
      .from("leads")
      .update({ status: "em_negociacao" })
      .eq("id", c.lead_id)
      .eq("corretora_id", profile.corretora_id)
      .eq("status", "novo");
    const user = await getUser();
    if (!leadErr && user) {
      await supabase.from("lead_events").insert({
        lead_id: c.lead_id,
        corretora_id: profile.corretora_id,
        actor_id: user.id,
        kind: "comment",
        payload: {
          text: "Proposta aceita — negociação em andamento.",
        } as unknown as Json,
      });
    }
  }

  // Proposta de LOTE aceita = lote vendido (deal fechado). Terminal: o card
  // para de oferecer "Criar proposta" e o detalhe trava. Best-effort; não
  // mexe em lote já vendido/arquivado.
  if (next === "aceita" && c.lote_id) {
    await supabase
      .from("lotes")
      .update({ status: "vendido" })
      .eq("id", c.lote_id)
      .eq("corretora_id", profile.corretora_id)
      .not("status", "in", "(vendido,arquivado)");
  }

  revalidateProposta({ leadId: c.lead_id, loteId: c.lote_id });
  redirect(`${backHref}?saved=Status%20da%20proposta%20atualizado`);
}

/**
 * Deleta proposta. Permitido só em rascunho — UI esconde botão pros
 * outros, mas a action revalida defensivamente.
 */
export async function deleteProposta(formData: FormData) {
  const profile = await ensureCorretora();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/painel/corretora");

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("propostas")
    .select("lead_id, lote_id, status")
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle();

  if (!current) redirect("/painel/corretora");

  const c = current as {
    lead_id: string | null;
    lote_id: string | null;
    status: PropostaStatus;
  };

  const backHref = c.lead_id
    ? `/painel/corretora/leads/${c.lead_id}`
    : c.lote_id
      ? `/painel/corretora/lotes/${c.lote_id}`
      : "/painel/corretora";

  if (c.status !== "rascunho") {
    redirect(
      `${backHref}?error=${encodeURIComponent("Só rascunho pode ser excluído.")}`,
    );
  }

  const { error } = await supabase
    .from("propostas")
    .delete()
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id);

  if (error) {
    const log = await getReqLogger({
      action: "deleteProposta",
      corretoraId: profile.corretora_id,
      propostaId: id,
    });
    log.error("proposta_delete_falhou", {
      code: error.code,
      err: safeError(error),
    });
    const params = new URLSearchParams({ error: friendlyPostgresError(error) });
    redirect(`${backHref}?${params.toString()}`);
  }

  revalidateProposta({ leadId: c.lead_id, loteId: c.lote_id });
  redirect(`${backHref}?saved=Proposta%20exclu%C3%ADda`);
}
