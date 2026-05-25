/**
 * Metadados puros das propostas (sem deps server). Importável de client
 * components sem arrastar `@milsaca/db/web/server`.
 *
 * Status segue o enum SQL `proposta_status`:
 *  rascunho → enviada → (aceita | rejeitada | expirada)
 *
 * Tipo hardcoded em vez de Database["public"]["Enums"]["proposta_status"]
 * pra evitar regenerar types do Supabase a cada mudança — quando
 * `supabase gen types` for re-rodado, dá pra trocar a referência sem
 * mexer no resto.
 */

export type PropostaStatus =
  | "rascunho"
  | "enviada"
  | "aceita"
  | "rejeitada"
  | "expirada";

export const PROPOSTA_STATUS_ORDER: PropostaStatus[] = [
  "rascunho",
  "enviada",
  "aceita",
  "rejeitada",
  "expirada",
];

export const PROPOSTA_STATUS_LABEL: Record<PropostaStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aceita: "Aceita",
  rejeitada: "Rejeitada",
  expirada: "Expirada",
};

export const PROPOSTA_STATUS_COLOR: Record<PropostaStatus, string> = {
  rascunho: "bg-slate-200 text-slate-700",
  enviada: "bg-sky-100 text-sky-800",
  aceita: "bg-emerald-100 text-emerald-800",
  rejeitada: "bg-rose-100 text-rose-800",
  expirada: "bg-amber-100 text-amber-800",
};

export type PropostaRow = {
  id: string;
  corretora_id: string;
  lead_id: string | null;
  lote_id: string | null;
  preco_saca: number;
  bag_count: number | null;
  mensagem: string | null;
  validade_ate: string | null;
  status: PropostaStatus;
  enviada_em: string | null;
  respondida_em: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
