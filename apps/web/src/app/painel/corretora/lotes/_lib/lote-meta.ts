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
  ultimo_classificacao_id: string | null;
  ultimo_peneira: string | null;
};

export type ProdutorOption = {
  id: string;
  nome: string;
};

/**
 * Ação PRIMÁRIA do card do lote (1 clique), alinhada ao estágio do ciclo de
 * classificação. Mesmo padrão do `primaryLeadAction`. `share` = botão WhatsApp
 * (o card monta o link com a cotação ref); `advance` = server action;
 * `link` = navegação.
 */
export type LoteAction =
  | { type: "share" }
  | { type: "advance"; label: string; toStatus: LoteStatus }
  | { type: "link"; label: string; href: string }
  | null;

export function nextLoteAction(lote: LoteRow): LoteAction {
  switch (lote.status) {
    case "rascunho":
      return {
        type: "advance",
        label: "Enviar pra classificação",
        toStatus: "aguardando_classificacao",
      };
    case "aguardando_classificacao":
      return {
        type: "link",
        label: "Lançar classificação",
        href: `/painel/corretora/lotes/${lote.id}/classificar`,
      };
    case "classificado":
      return { type: "share" };
    case "fora_de_tipo":
      return {
        type: "advance",
        label: "Rebeneficiar",
        toStatus: "rebeneficiar",
      };
    case "rebeneficiar":
      return {
        type: "advance",
        label: "Marcar classificado",
        toStatus: "classificado",
      };
    case "vendido":
      return {
        type: "link",
        label: "Ver contrato",
        href: `/painel/corretora/lotes/${lote.id}`,
      };
    default:
      return null;
  }
}
