import { createClient } from "@milsaca/db/web/server";
import type { PropostaRow } from "./proposta-meta";

export type {
  PropostaRow,
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

