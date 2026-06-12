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
import type { LeadStatus, LeadOrigem } from "./_lib/queries";
// Fonte única do rótulo da corretora: LEAD_STATUS_LABEL vem de lead-meta.ts
// (re-exportado por queries.ts). Wording masculino ("Novo/.../Perdido")
// igual à lista de leads — não redefinir localmente.
import { LEAD_STATUS_ORDER, LEAD_STATUS_LABEL } from "./_lib/queries";
import { LEAD_ORIGEM_ORDER } from "./_lib/lead-meta";

function formatProposta(
  coffee_type: string | null,
  bag_count: number | null,
  proposed_price: number | null,
): string {
  const parts: string[] = [];
  if (coffee_type) parts.push(coffee_type);
  if (bag_count != null) parts.push(`${bag_count} sacas`);
  if (proposed_price != null) {
    parts.push(`R$ ${proposed_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/sc`);
  }
  return parts.join(" — ");
}

function clean(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function parseNumber(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
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

function isLeadStatus(v: string): v is LeadStatus {
  return (LEAD_STATUS_ORDER as readonly string[]).includes(v);
}

function parseOrigem(v: FormDataEntryValue | null): LeadOrigem | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return (LEAD_ORIGEM_ORDER as readonly string[]).includes(s)
    ? (s as LeadOrigem)
    : null;
}

function parseTarget(
  raw: string,
): { kind: "produtor" | "contato"; id: string } | null {
  const [k, id] = raw.split(":");
  if (!id) return null;
  if (k === "produtor") return { kind: "produtor", id };
  if (k === "contato") return { kind: "contato", id };
  return null;
}

function revalidateLead(id?: string) {
  revalidatePath("/painel/corretora/leads");
  revalidatePath("/painel/corretora");
  if (id) revalidatePath(`/painel/corretora/leads/${id}`);
}

export async function createLead(formData: FormData) {
  const profile = await ensureCorretora();
  const user = await getUser();
  if (!user) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/leads",
  );

  const targetRaw = String(formData.get("target") ?? "").trim();
  const target = parseTarget(targetRaw);
  const coffee_type = clean(formData.get("coffee_type"));
  const bag_count = parseInteger(formData.get("bag_count"));
  const proposed_price = parseNumber(formData.get("proposed_price"));
  const notes = clean(formData.get("notes"));
  const origem = parseOrigem(formData.get("origem")) ?? "manual";

  const errors: string[] = [];
  if (!target) errors.push("Escolha um produtor ou contato");

  if (errors.length > 0) {
    const params = new URLSearchParams({ error: errors.join(", ") });
    redirect(`/painel/corretora/leads/novo?${params.toString()}`);
  }

  const t = target as { kind: "produtor" | "contato"; id: string };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      corretora_id: profile.corretora_id,
      produtor_id: t.kind === "produtor" ? t.id : null,
      contato_id: t.kind === "contato" ? t.id : null,
      status: "novo",
      origem,
      coffee_type,
      bag_count,
      proposed_price,
      notes,
    })
    .select("id")
    .single();

  if (error || !data) {
    const log = await getReqLogger({
      action: "createLead",
      corretoraId: profile.corretora_id,
    });
    log.error("lead_insert_falhou", {
      code: error?.code,
      err: safeError(error ?? "insert sem retorno"),
    });
    // Sanitiza erro cru (vai pro toast). Inconsistente vazar texto
    // bruto do Postgres aqui se updateLeadFields já usa friendly.
    const params = new URLSearchParams({
      error: friendlyPostgresError(error ?? null),
    });
    redirect(`/painel/corretora/leads/novo?${params.toString()}`);
  }

  const { error: eventErr } = await supabase.from("lead_events").insert({
    lead_id: data.id,
    corretora_id: profile.corretora_id,
    actor_id: user.id,
    kind: "created",
    payload: {
      coffee_type,
      bag_count,
      proposed_price,
      target_kind: t.kind,
    } as unknown as Json,
  });
  if (eventErr) {
    const log = await getReqLogger({
      action: "createLead",
      corretoraId: profile.corretora_id,
      leadId: data.id,
    });
    log.warn("lead_event_insert_falhou", {
      kind: "created",
      code: eventErr.code,
      err: safeError(eventErr),
    });
  }

  // Notifica o produtor apenas quando o alvo é um produtor real (com auth.user).
  // Contato sombra (produtor_contatos) não tem user_id pra notificar.
  if (t.kind === "produtor") {
    const proposta = formatProposta(coffee_type, bag_count, proposed_price);
    await notify({
      userId: t.id,
      kind: "lead",
      title: "Nova proposta de café",
      body: proposta || "Você recebeu uma nova proposta.",
      data: {
        lead_id: data.id,
        corretora_id: profile.corretora_id,
        href: `/painel/produtor/negociacoes/${data.id}`,
      },
    });
  }

  revalidateLead(data.id);
  redirect(`/painel/corretora/leads/${data.id}`);
}

export async function updateLeadFields(formData: FormData) {
  const profile = await ensureCorretora();
  const user = await getUser();
  if (!user) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/painel/corretora/leads");

  const coffee_type = clean(formData.get("coffee_type"));
  const bag_count = parseInteger(formData.get("bag_count"));
  const proposed_price = parseNumber(formData.get("proposed_price"));
  const notes = clean(formData.get("notes"));

  const supabase = await createClient();

  // Lead convertido (já virou contrato) é read-only: editar quantidade/preço
  // aqui divergiria do contrato congelado. Trava no servidor.
  const { data: atual } = await supabase
    .from("leads")
    .select("status")
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle<{ status: LeadStatus }>();
  if (!atual) redirect("/painel/corretora/leads");
  if (atual.status === "convertido") {
    const params = new URLSearchParams({
      error: "Lead convertido não pode ser editado — ele já virou contrato.",
    });
    redirect(`/painel/corretora/leads/${id}?${params.toString()}`);
  }

  const { error } = await supabase
    .from("leads")
    .update({ coffee_type, bag_count, proposed_price, notes })
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id);

  if (error) {
    const log = await getReqLogger({
      action: "updateLeadFields",
      corretoraId: profile.corretora_id,
      leadId: id,
    });
    log.error("lead_update_falhou", {
      code: error.code,
      err: safeError(error),
    });
    const params = new URLSearchParams({ error: friendlyPostgresError(error) });
    redirect(`/painel/corretora/leads/${id}?${params.toString()}`);
  }

  const { error: eventErr } = await supabase.from("lead_events").insert({
    lead_id: id,
    corretora_id: profile.corretora_id,
    actor_id: user.id,
    kind: "updated",
    payload: {
      coffee_type,
      bag_count,
      proposed_price,
      notes_changed: notes != null,
    } as unknown as Json,
  });
  if (eventErr) {
    const log = await getReqLogger({
      action: "updateLeadFields",
      corretoraId: profile.corretora_id,
      leadId: id,
    });
    log.warn("lead_event_insert_falhou", {
      kind: "updated",
      code: eventErr.code,
      err: safeError(eventErr),
    });
  }

  revalidateLead(id);
  redirect(`/painel/corretora/leads/${id}?saved=1`);
}

export async function updateLeadStatus(formData: FormData) {
  const profile = await ensureCorretora();
  const user = await getUser();
  if (!user) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/leads",
  );

  const id = String(formData.get("id") ?? "").trim();
  const next = String(formData.get("status") ?? "").trim();
  const comment = clean(formData.get("comment"));
  if (!id || !isLeadStatus(next)) redirect("/painel/corretora/leads");

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("leads")
    .select("status, produtor_id")
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle();

  if (!current) redirect("/painel/corretora/leads");

  // Lead convertido é TERMINAL: virou contrato, não pode voltar pra
  // novo/negociação/perdido/arquivado. Trava no servidor (não só na UI).
  if (current.status === "convertido") {
    const log = await getReqLogger({
      action: "updateLeadStatus",
      corretoraId: profile.corretora_id,
      leadId: id,
    });
    log.warn("lead_convertido_transicao_bloqueada", { to: next });
    const params = new URLSearchParams({
      error:
        "Lead convertido não muda de status — ele já virou negócio fechado. Gerencie pelo contrato.",
    });
    redirect(`/painel/corretora/leads/${id}?${params.toString()}`);
  }

  // Conversão não é manual: o lead vira convertido só quando o contrato é
  // gerado (createContrato). Bloqueia setar convertido por aqui — assim não
  // nasce lead convertido sem contrato.
  if (next === "convertido") {
    const params = new URLSearchParams({
      error: "O lead vira convertido ao gerar o contrato — use “Gerar contrato”.",
    });
    redirect(`/painel/corretora/leads/${id}?${params.toString()}`);
  }

  if (current.status === next) {
    // sem mudança real, mas se houver comentário registra como comment
    if (comment) {
      const { error: eventErr } = await supabase.from("lead_events").insert({
        lead_id: id,
        corretora_id: profile.corretora_id,
        actor_id: user.id,
        kind: "comment",
        payload: { text: comment } as unknown as Json,
      });
      if (eventErr) {
        const log = await getReqLogger({
          action: "updateLeadStatus",
          corretoraId: profile.corretora_id,
          leadId: id,
        });
        log.warn("lead_event_insert_falhou", {
          kind: "comment",
          code: eventErr.code,
          err: safeError(eventErr),
        });
      }
    }
    revalidateLead(id);
    redirect(`/painel/corretora/leads/${id}`);
  }

  const { error } = await supabase
    .from("leads")
    .update({ status: next as LeadStatus })
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id);

  if (error) {
    const log = await getReqLogger({
      action: "updateLeadStatus",
      corretoraId: profile.corretora_id,
      leadId: id,
    });
    log.error("lead_status_update_falhou", {
      from: current.status,
      to: next,
      code: error.code,
      err: safeError(error),
    });
    const params = new URLSearchParams({ error: friendlyPostgresError(error) });
    redirect(`/painel/corretora/leads/${id}?${params.toString()}`);
  }

  const { error: eventErr } = await supabase.from("lead_events").insert({
    lead_id: id,
    corretora_id: profile.corretora_id,
    actor_id: user.id,
    kind: "status_changed",
    payload: {
      from: current.status,
      to: next,
      comment: comment ?? null,
    } as unknown as Json,
  });
  if (eventErr) {
    const log = await getReqLogger({
      action: "updateLeadStatus",
      corretoraId: profile.corretora_id,
      leadId: id,
    });
    log.warn("lead_event_insert_falhou", {
      kind: "status_changed",
      code: eventErr.code,
      err: safeError(eventErr),
    });
  }

  if (current.produtor_id) {
    await notify({
      userId: current.produtor_id,
      kind: "lead",
      title: `Proposta ${LEAD_STATUS_LABEL[next as LeadStatus]?.toLowerCase() ?? next}`,
      body: comment ?? null,
      data: {
        lead_id: id,
        corretora_id: profile.corretora_id,
        from: current.status,
        to: next,
        href: `/painel/produtor/negociacoes/${id}`,
      },
    });
  }

  revalidateLead(id);
  redirect(`/painel/corretora/leads/${id}`);
}

export async function addLeadComment(formData: FormData) {
  const profile = await ensureCorretora();
  const user = await getUser();
  if (!user) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  await requireActiveSubscription(
    profile.corretora_id,
    "/painel/corretora/leads",
  );

  const id = String(formData.get("id") ?? "").trim();
  const text = clean(formData.get("text"));
  if (!id || !text) redirect(`/painel/corretora/leads/${id}`);

  const supabase = await createClient();

  // Posse do lead ANTES de escrever na timeline: sem isso, um lead_id de
  // outra corretora passaria na RLS (que só valida o corretora_id do autor)
  // — injeção cross-tenant de escrita (auditoria 2026-06-12).
  const { data: leadDono } = await supabase
    .from("leads")
    .select("id")
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle();
  if (!leadDono) {
    redirect(
      `/painel/corretora/leads?error=${encodeURIComponent("Lead não encontrado.")}`,
    );
  }

  const { error: eventErr } = await supabase.from("lead_events").insert({
    lead_id: id,
    corretora_id: profile.corretora_id,
    actor_id: user.id,
    kind: "comment",
    payload: { text } as unknown as Json,
  });
  if (eventErr) {
    const log = await getReqLogger({
      action: "addLeadComment",
      corretoraId: profile.corretora_id,
      leadId: id,
    });
    log.warn("lead_event_insert_falhou", {
      kind: "comment",
      code: eventErr.code,
      err: safeError(eventErr),
    });
  }

  revalidateLead(id);
  redirect(`/painel/corretora/leads/${id}`);
}
