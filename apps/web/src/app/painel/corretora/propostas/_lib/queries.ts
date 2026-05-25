import { createClient } from "@milsaca/db/web/server";
import type { PropostaRow, PropostaStatus } from "./proposta-meta";

export type {
  PropostaRow,
  PropostaStatus,
} from "./proposta-meta";

const SELECT_FIELDS = `
  id, corretora_id, lead_id, lote_id, preco_saca, bag_count, mensagem,
  validade_ate, status, enviada_em, respondida_em, created_by,
  created_at, updated_at
`;

function toPropostaRow(row: PropostaRow): PropostaRow {
  return {
    ...row,
    preco_saca: Number(row.preco_saca),
  };
}

export async function listPropostasDoLead(
  corretoraId: string,
  leadId: string,
): Promise<PropostaRow[]> {
  if (!corretoraId || !leadId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("propostas")
    .select(SELECT_FIELDS)
    .eq("corretora_id", corretoraId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as PropostaRow[]).map(toPropostaRow);
}

export async function listPropostasDoLote(
  corretoraId: string,
  loteId: string,
): Promise<PropostaRow[]> {
  if (!corretoraId || !loteId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("propostas")
    .select(SELECT_FIELDS)
    .eq("corretora_id", corretoraId)
    .eq("lote_id", loteId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as PropostaRow[]).map(toPropostaRow);
}

/**
 * KPIs agregadas pra dashboard ou bloco de propostas.
 */
export type PropostasKpis = {
  rascunho: number;
  enviadas: number;
  aceitas: number;
  rejeitadas: number;
  expiradas: number;
  pendentes: number; // enviadas - sem resposta
  total: number;
};

export async function loadPropostasKpis(
  corretoraId: string,
): Promise<PropostasKpis> {
  const empty: PropostasKpis = {
    rascunho: 0,
    enviadas: 0,
    aceitas: 0,
    rejeitadas: 0,
    expiradas: 0,
    pendentes: 0,
    total: 0,
  };
  if (!corretoraId) return empty;
  const supabase = await createClient();
  const { data } = await supabase
    .from("propostas")
    .select("status")
    .eq("corretora_id", corretoraId);

  const rows = (data ?? []) as { status: PropostaStatus }[];
  if (rows.length === 0) return empty;

  const acc: PropostasKpis = { ...empty, total: rows.length };
  for (const r of rows) {
    if (r.status === "rascunho") acc.rascunho++;
    else if (r.status === "enviada") {
      acc.enviadas++;
      acc.pendentes++;
    } else if (r.status === "aceita") acc.aceitas++;
    else if (r.status === "rejeitada") acc.rejeitadas++;
    else if (r.status === "expirada") acc.expiradas++;
  }
  return acc;
}
