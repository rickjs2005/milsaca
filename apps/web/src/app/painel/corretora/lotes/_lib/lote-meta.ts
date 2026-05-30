/**
 * Metadados puros do lote (sem deps server). Importável de client
 * components sem fazer o bundler arrastar `@milsaca/db/web/server`
 * pro browser.
 */

import type { Lote } from "@milsaca/types";
import type { StatusTone } from "@/components/status-badge";

export type LoteStatus = Lote["status"];

export const LOTE_STATUS_ORDER: LoteStatus[] = [
  "rascunho",
  "aguardando_classificacao",
  "classificado",
  "fora_de_tipo",
  "rebeneficiar",
  "vendido",
  "arquivado",
];

export const LOTE_STATUS_LABEL: Record<LoteStatus, string> = {
  rascunho: "Rascunho",
  aguardando_classificacao: "Aguardando classificação",
  classificado: "Classificado · disponível",
  fora_de_tipo: "Fora de tipo",
  rebeneficiar: "Rebeneficiar",
  vendido: "Vendido",
  arquivado: "Arquivado",
};

export const LOTE_STATUS_COLOR: Record<LoteStatus, string> = {
  rascunho: "bg-slate-200 text-slate-700",
  aguardando_classificacao: "bg-milsaca-dourado/20 text-milsaca-verde",
  classificado: "bg-emerald-100 text-emerald-800",
  fora_de_tipo: "bg-rose-100 text-rose-800",
  rebeneficiar: "bg-amber-100 text-amber-800",
  vendido: "bg-milsaca-verde text-milsaca-cream",
  arquivado: "bg-slate-200 text-slate-700",
};

// Tone semântico (fundação D1) — usado pelo <StatusBadge> nos cards.
export const LOTE_STATUS_TONE: Record<LoteStatus, StatusTone> = {
  rascunho: "neutral",
  aguardando_classificacao: "warning",
  classificado: "success",
  fora_de_tipo: "danger",
  rebeneficiar: "warning",
  vendido: "premium",
  arquivado: "neutral",
};

/** Status que indicam "lote pode ser negociado". */
export const LOTE_STATUS_ACTIVE: LoteStatus[] = [
  "aguardando_classificacao",
  "classificado",
  "fora_de_tipo",
  "rebeneficiar",
];

export const SPECIE_LABEL: Record<"arabica" | "conillon", string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};

export const PROCESSO_LABEL: Record<string, string> = {
  natural: "Natural",
  cd_desmucilado: "CD desmucilado",
  despolpado: "Despolpado",
  fermentacao_induzida: "Fermentação induzida",
};

export type LoteRow = {
  id: string;
  codigo: string;
  specie: "arabica" | "conillon";
  processo: Lote["processo"];
  safra: string | null;
  peso_sacas: number | null;
  status: LoteStatus;
  created_at: string;
  updated_at: string;
  produtor_id: string | null;
  produtor_nome: string;
  produtor_phone: string | null;
  fazenda: string | null;
  city: string | null;
  state: string | null;
  ultimo_tipo: string | null;
  ultimo_fora_de_tipo: boolean;
};

export type ProdutorOption = {
  id: string;
  nome: string;
};
