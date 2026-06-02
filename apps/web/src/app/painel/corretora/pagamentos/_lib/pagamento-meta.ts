import type { Database } from "@milsaca/types/database";
import type { StatusTone } from "@/components/status-badge";

export type PagamentoStatus = Database["public"]["Enums"]["pagamento_status"];

export const PAGAMENTO_STATUS_ORDER: PagamentoStatus[] = [
  "pendente",
  "pago",
  "vencido",
  "cancelado",
];

export const PAGAMENTO_STATUS_LABEL: Record<PagamentoStatus, string> = {
  pendente: "A repassar",
  pago: "Repassado",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

// Tone semântico (fundação D1) — usado pelo <StatusBadge> nas listagens.
export const PAGAMENTO_STATUS_TONE: Record<PagamentoStatus, StatusTone> = {
  pendente: "warning",
  pago: "success",
  vencido: "danger",
  cancelado: "neutral",
};

/** Status "em aberto" — ainda devem ser pagos. */
export const PAGAMENTO_ABERTO_STATUS: PagamentoStatus[] = ["pendente", "vencido"];

export function isPagamentoAberto(status: PagamentoStatus): boolean {
  return PAGAMENTO_ABERTO_STATUS.includes(status);
}

export type PagamentoItem = {
  id: string;
  valor_bruto: number;
  valor_liquido: number;
  status: PagamentoStatus;
  data_prevista: string | null;
  data_paga: string | null;
  comprovante_url: string | null;
  observacoes: string | null;
  created_at: string;
  contrato_code: string | null;
  produtor_nome: string;
  /** Há entrega conferida no contrato — sinal de que o repasse está liberado. */
  entrega_conferida: boolean;
};

/**
 * Ação PRIMÁRIA por estágio do pagamento. "Marcar pago" abre um modal
 * (exige comprovante + confirmação) — por isso é `kind: "pay"`, não um link.
 */
export type PagamentoAction =
  | { kind: "pay"; label: string }
  | { kind: "view-comprovante"; label: string }
  | { kind: "none" };

export function nextPaymentAction(p: {
  status: PagamentoStatus;
  comprovante_url: string | null;
}): PagamentoAction {
  if (isPagamentoAberto(p.status)) return { kind: "pay", label: "Marcar repasse feito" };
  if (p.status === "pago" && p.comprovante_url)
    return { kind: "view-comprovante", label: "Ver comprovante" };
  return { kind: "none" };
}
