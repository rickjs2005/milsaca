import type { Database } from "@milsaca/types/database";
import type { StatusTone } from "@/components/status-badge";

export type ContratoStatus = Database["public"]["Enums"]["contrato_status"];

export const CONTRATO_STATUS_ORDER: ContratoStatus[] = [
  "rascunho",
  "em_analise",
  "ativo",
  "finalizado",
  "cancelado",
];

export const CONTRATO_STATUS_LABEL: Record<ContratoStatus, string> = {
  rascunho: "Rascunho",
  em_analise: "Em análise",
  ativo: "Ativo",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

// Tokens semânticos (migrado do slate/emerald/rose legado).
export const CONTRATO_STATUS_COLOR: Record<ContratoStatus, string> = {
  rascunho: "bg-neutral-200 text-neutral-700",
  em_analise: "bg-warning-50 text-warning-700",
  ativo: "bg-success-50 text-success-700",
  finalizado: "bg-milsaca-cafezal text-milsaca-cream",
  cancelado: "bg-neutral-100 text-neutral-700",
};

export const CONTRATO_STATUS_TONE: Record<ContratoStatus, StatusTone> = {
  rascunho: "neutral",
  em_analise: "warning",
  ativo: "success",
  finalizado: "premium",
  cancelado: "neutral",
};

export type ContratoListItem = {
  id: string;
  code: string;
  status: ContratoStatus;
  coffee_type: string | null;
  bag_count: number | null;
  total_value: number | null;
  comissao_total: number | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  produtor_id: string;
  produtor_nome: string;
  produtor_phone: string | null;
  comprador_nome: string | null;
  lead_id: string | null;
};

// Máquina de estados do contrato. Assinado (ativo) NÃO volta pra rascunho/
// análise — preserva o content_hash congelado na assinatura. `finalizado`
// só pode ser cancelado; `cancelado` é terminal. Fonte única: usada pela
// server action (guard) e pela UI (mostra só transições válidas).
export const CONTRATO_TRANSICOES: Record<ContratoStatus, ContratoStatus[]> = {
  rascunho: ["em_analise", "ativo", "cancelado"],
  em_analise: ["rascunho", "ativo", "cancelado"],
  ativo: ["finalizado", "cancelado"],
  finalizado: ["cancelado"],
  cancelado: [],
};

export function podeTransicionarContrato(
  from: ContratoStatus,
  to: ContratoStatus,
): boolean {
  return from === to || (CONTRATO_TRANSICOES[from] ?? []).includes(to);
}

/** Contrato com documento verificável publicamente (assinado/ativo). */
export function contratoVerificavel(status: ContratoStatus): boolean {
  return status === "ativo" || status === "finalizado";
}

/**
 * Ação PRIMÁRIA por estágio do ciclo de assinatura. Ligada às rotas que
 * existem: espelho (PDF/impressão) e o detalhe (onde se gerencia o envio
 * pra assinatura). `Verificar` (público) é mostrado à parte quando ativo.
 */
export function nextContractAction(c: {
  id: string;
  status: ContratoStatus;
}): { label: string; href: string } {
  const detail = `/painel/corretora/contratos/${c.id}`;
  switch (c.status) {
    case "rascunho":
      return { label: "Enviar p/ assinatura", href: detail };
    case "em_analise":
      return { label: "Acompanhar assinatura", href: detail };
    case "ativo":
    case "finalizado":
      return { label: "Ver PDF", href: `${detail}/espelho` };
    default:
      return { label: "Ver", href: detail };
  }
}
