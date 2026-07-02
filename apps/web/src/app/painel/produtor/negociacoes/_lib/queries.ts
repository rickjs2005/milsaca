import { createClient } from "@milsaca/db/web/server";

// Fonte única do rótulo da persona produtor (web) vive em ./lead-labels
// (módulo puro, sem deps server). Re-exportado aqui pra clients que já
// importam de queries.ts — não redefinir os mapas localmente.
export {
  LEAD_STATUS_LABEL,
} from "./lead-labels";
export type { LeadStatus } from "./lead-labels";

import type { LeadStatus } from "./lead-labels";

export type NegociacaoListItem = {
  id: string;
  status: LeadStatus;
  coffee_type: string | null;
  bag_count: number | null;
  proposed_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  corretora_id: string;
  corretora_nome: string;
  corretora_phone: string | null;
  corretora_city: string | null;
};

type Row = {
  id: string;
  status: LeadStatus;
  coffee_type: string | null;
  bag_count: number | null;
  proposed_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  corretora_id: string;
  corretora:
    | { id: string; name: string; phone: string | null; city: string | null }
    | { id: string; name: string; phone: string | null; city: string | null }[]
    | null;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function listMinhasNegociacoes(
  produtorId: string,
  filter: { status?: LeadStatus } = {},
): Promise<NegociacaoListItem[]> {
  const supabase = await createClient();
  let q = supabase
    .from("leads")
    .select(
      `id, status, coffee_type, bag_count, proposed_price, notes,
       created_at, updated_at, corretora_id,
       corretora:corretoras!leads_corretora_id_fkey(id, name, phone, city)`,
    )
    .eq("produtor_id", produtorId)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (filter.status) q = q.eq("status", filter.status);

  const { data } = await q;
  const rows = (data ?? []) as Row[];

  return rows.map((r): NegociacaoListItem => {
    const cor = pickOne(r.corretora);
    return {
      id: r.id,
      status: r.status,
      coffee_type: r.coffee_type,
      // bag_count é numeric no Postgres → vem como string; coage (igual proposed_price).
      bag_count: r.bag_count != null ? Number(r.bag_count) : null,
      proposed_price:
        r.proposed_price != null ? Number(r.proposed_price) : null,
      notes: r.notes,
      created_at: r.created_at,
      updated_at: r.updated_at,
      corretora_id: r.corretora_id,
      corretora_nome: cor?.name ?? "—",
      corretora_phone: cor?.phone ?? null,
      corretora_city: cor?.city ?? null,
    };
  });
}

export type NegociacaoEvent = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type PropostaStatus =
  | "rascunho"
  | "enviada"
  | "aceita"
  | "rejeitada"
  | "expirada";

/**
 * Proposta real da corretora (tabela `propostas`) — fonte de verdade do
 * preço, ao contrário de `leads.proposed_price` (campo legado/sugerido).
 * Lida via RPC `v1_listar_propostas_produtor` (SECURITY DEFINER) porque a
 * RLS de `propostas` é owner-only e o produtor não lê a tabela direto.
 */
export type PropostaProdutor = {
  id: string;
  status: PropostaStatus;
  preco_saca: number;
  bag_count: number | null;
  mensagem: string | null;
  validade_ate: string | null;
  enviada_em: string | null;
  created_at: string;
};

export type NegociacaoDetail = NegociacaoListItem & {
  events: NegociacaoEvent[];
  /** Propostas reais deste lead, mais recente primeiro. */
  propostas: PropostaProdutor[];
};

export async function getMinhaNegociacao(
  produtorId: string,
  leadId: string,
): Promise<NegociacaoDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select(
      `id, status, coffee_type, bag_count, proposed_price, notes,
       created_at, updated_at, corretora_id,
       corretora:corretoras!leads_corretora_id_fkey(id, name, phone, city)`,
    )
    .eq("produtor_id", produtorId)
    .eq("id", leadId)
    .maybeSingle();

  if (!data) return null;
  const r = data as Row;
  const cor = pickOne(r.corretora);

  const { data: eventsRaw } = await supabase
    .from("lead_events")
    .select("id, kind, payload, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(200);

  type EventRow = {
    id: string;
    kind: string;
    payload: Record<string, unknown> | null;
    created_at: string;
  };

  const events: NegociacaoEvent[] = ((eventsRaw ?? []) as EventRow[]).map(
    (e) => ({
      id: e.id,
      kind: e.kind,
      payload: e.payload ?? {},
      created_at: e.created_at,
    }),
  );

  // Propostas reais via RPC (owner-only na RLS → produtor não lê a tabela).
  // O RPC já filtra por auth.uid() = leads.produtor_id; filtramos por lead aqui.
  const { data: propRaw } = await supabase.rpc("v1_listar_propostas_produtor", {
    p_only_pending: false,
  });
  const propostas: PropostaProdutor[] = ((propRaw ?? []) as Array<{
    id: string;
    status: PropostaStatus;
    preco_saca: number | string | null;
    bag_count: number | null;
    mensagem: string | null;
    validade_ate: string | null;
    enviada_em: string | null;
    created_at: string;
    lead_id: string | null;
  }>)
    .filter((p) => p.lead_id === leadId)
    .map((p) => ({
      id: p.id,
      status: p.status,
      preco_saca: p.preco_saca != null ? Number(p.preco_saca) : 0,
      bag_count: p.bag_count != null ? Number(p.bag_count) : null,
      mensagem: p.mensagem,
      validade_ate: p.validade_ate,
      enviada_em: p.enviada_em,
      created_at: p.created_at,
    }));

  return {
    id: r.id,
    status: r.status,
    coffee_type: r.coffee_type,
    // bag_count é numeric no Postgres → vem como string; coage (igual proposed_price).
    bag_count: r.bag_count != null ? Number(r.bag_count) : null,
    proposed_price: r.proposed_price != null ? Number(r.proposed_price) : null,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
    corretora_id: r.corretora_id,
    corretora_nome: cor?.name ?? "—",
    corretora_phone: cor?.phone ?? null,
    corretora_city: cor?.city ?? null,
    events,
    propostas,
  };
}
