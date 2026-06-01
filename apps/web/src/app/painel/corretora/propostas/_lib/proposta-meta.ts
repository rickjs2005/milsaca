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

import type { StatusTone } from "@/components/status-badge";

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

// Tokens semânticos de fundação (D1). Espelha OFERTA_STATUS_COLOR pros
// estados equivalentes — proposta e oferta são fluxos gêmeos
// (rascunho→enviada→aceita/rejeitada|recusada/expirada).
export const PROPOSTA_STATUS_COLOR: Record<PropostaStatus, string> = {
  rascunho: "bg-neutral-200 text-neutral-700",
  enviada: "bg-warning-50 text-warning-700",
  aceita: "bg-success-50 text-success-700",
  rejeitada: "bg-danger-50 text-danger-700",
  expirada: "bg-neutral-200 text-neutral-700",
};

// tone → StatusBadge. Mesmo mapa de OFERTA_STATUS_TONE (rejeitada ≡ recusada).
export const PROPOSTA_STATUS_TONE: Record<PropostaStatus, StatusTone> = {
  rascunho: "neutral",
  enviada: "warning",
  aceita: "success",
  rejeitada: "danger",
  expirada: "neutral",
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
