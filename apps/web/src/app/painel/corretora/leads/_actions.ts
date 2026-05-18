"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import type { Json } from "@milsaca/types/database";
import { getProfile, getUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import type { LeadStatus } from "./_lib/queries";
import { LEAD_STATUS_ORDER } from "./_lib/queries";

const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Nova",
  em_negociacao: "Em negociação",
  convertido: "Convertida",
  perdido: "Perdida",
  arquivado: "Arquivada",
};

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
  const profile = await getProfile();
  const user = await getUser();
  if (!profile?.corretora_id || !user) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const targetRaw = String(formData.get("target") ?? "").trim();
  const target = parseTarget(targetRaw);
  const coffee_type = clean(formData.get("coffee_type"));
  const bag_count = parseInteger(formData.get("bag_count"));
  const proposed_price = parseNumber(formData.get("proposed_price"));
  const notes = clean(formData.get("notes"));

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
      coffee_type,
      bag_count,
      proposed_price,
      notes,
    })
    .select("id")
    .single();

  if (error || !data) {
    const params = new URLSearchParams({
      error: error?.message ?? "Falha ao criar lead",
    });
    redirect(`/painel/corretora/leads/novo?${params.toString()}`);
  }

  await supabase.from("lead_events").insert({
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
  const profile = await getProfile();
  const user = await getUser();
  if (!profile?.corretora_id || !user) redirect("/painel");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/painel/corretora/leads");

  const coffee_type = clean(formData.get("coffee_type"));
  const bag_count = parseInteger(formData.get("bag_count"));
  const proposed_price = parseNumber(formData.get("proposed_price"));
  const notes = clean(formData.get("notes"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ coffee_type, bag_count, proposed_price, notes })
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id);

  if (error) {
    const params = new URLSearchParams({ error: error.message });
    redirect(`/painel/corretora/leads/${id}?${params.toString()}`);
  }

  await supabase.from("lead_events").insert({
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

  revalidateLead(id);
  redirect(`/painel/corretora/leads/${id}?saved=1`);
}

export async function updateLeadStatus(formData: FormData) {
  const profile = await getProfile();
  const user = await getUser();
  if (!profile?.corretora_id || !user) redirect("/painel");

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
  if (current.status === next) {
    // sem mudança real, mas se houver comentário registra como comment
    if (comment) {
      await supabase.from("lead_events").insert({
        lead_id: id,
        corretora_id: profile.corretora_id,
        actor_id: user.id,
        kind: "comment",
        payload: { text: comment } as unknown as Json,
      });
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
    const params = new URLSearchParams({ error: error.message });
    redirect(`/painel/corretora/leads/${id}?${params.toString()}`);
  }

  await supabase.from("lead_events").insert({
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
  const profile = await getProfile();
  const user = await getUser();
  if (!profile?.corretora_id || !user) redirect("/painel");

  const id = String(formData.get("id") ?? "").trim();
  const text = clean(formData.get("text"));
  if (!id || !text) redirect(`/painel/corretora/leads/${id}`);

  const supabase = await createClient();
  await supabase.from("lead_events").insert({
    lead_id: id,
    corretora_id: profile.corretora_id,
    actor_id: user.id,
    kind: "comment",
    payload: { text } as unknown as Json,
  });

  revalidateLead(id);
  redirect(`/painel/corretora/leads/${id}`);
}
