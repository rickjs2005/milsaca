import type { Database } from "@milsaca/types/database";
import type { StatusTone } from "@/components/status-badge";

export type EntregaStatus = Database["public"]["Enums"]["entrega_status"];

export const ENTREGA_STATUS_ORDER: EntregaStatus[] = [
  "programada",
  "em_transito",
  "recebida",
  "conferida",
  "cancelada",
];

export const ENTREGA_STATUS_LABEL: Record<EntregaStatus, string> = {
  programada: "Programada",
  em_transito: "Em trânsito",
  recebida: "Recebida",
  conferida: "Conferida",
  cancelada: "Cancelada",
};

// Tokens semânticos (migrado do sky/emerald/slate legado).
export const ENTREGA_STATUS_COLOR: Record<EntregaStatus, string> = {
  programada: "bg-warning-50 text-warning-700",
  em_transito: "bg-info-50 text-info-700",
  recebida: "bg-success-50 text-success-700",
  conferida: "bg-milsaca-cafezal text-milsaca-cream",
  cancelada: "bg-neutral-200 text-neutral-700",
};

export const ENTREGA_STATUS_TONE: Record<EntregaStatus, StatusTone> = {
  programada: "warning",
  em_transito: "info",
  recebida: "success",
  conferida: "premium",
  cancelada: "neutral",
};

export const ENTREGA_PENDENTE_STATUS: EntregaStatus[] = [
  "programada",
  "em_transito",
];

export type EntregaListItem = {
  id: string;
  sequencia: number;
  bag_count: number | null;
  peso_liquido_kg: number | null;
  status: EntregaStatus;
  data_prevista: string | null;
  data_realizada: string | null;
  contrato_id: string;
  contrato_code: string;
  produtor_id: string;
  produtor_nome: string;
  is_atrasada: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Sacas recebidas. Prefere a quantidade declarada (`bag_count`) — é o número
 * acordado e independe do peso da saca. Só cai no peso/60kg como estimativa
 * quando não há contagem declarada (evita divergência falsa quando saca ≠ 60kg).
 */
export function sacasRecebidas(e: EntregaListItem): number | null {
  if (e.bag_count != null) return e.bag_count;
  return e.peso_liquido_kg != null ? Math.round(e.peso_liquido_kg / 60) : null;
}

/**
 * Ação PRIMÁRIA por estágio do ciclo de recebimento. Tudo acontece no
 * detalhe (romaneio): registrar chegada / confirmar / conferir peso.
 */
export function nextDeliveryAction(e: {
  id: string;
  status: EntregaStatus;
}): { label: string; href: string } {
  const detail = `/painel/corretora/entregas/${e.id}`;
  switch (e.status) {
    case "programada":
      return { label: "Registrar chegada", href: detail };
    case "em_transito":
      return { label: "Confirmar recebimento", href: detail };
    case "recebida":
      return { label: "Conferir peso", href: detail };
    case "conferida":
      return { label: "Ver romaneio", href: detail };
    default:
      return { label: "Ver", href: detail };
  }
}
