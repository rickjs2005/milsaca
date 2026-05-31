import type { StatusTone } from "@/components/status-badge";

export type OfertaStatus =
  | "rascunho"
  | "enviada"
  | "aceita"
  | "recusada"
  | "expirada";

export const OFERTA_STATUS_ORDER: OfertaStatus[] = [
  "enviada",
  "aceita",
  "recusada",
  "expirada",
  "rascunho",
];

export const OFERTA_STATUS_LABEL: Record<OfertaStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aceita: "Aceita",
  recusada: "Recusada",
  expirada: "Expirada",
};

// Legado — usado no badge de ofertas dentro do detalhe do lote. A migrar
// pro tom semântico (OFERTA_STATUS_TONE + StatusBadge) num cleanup futuro.
export const OFERTA_STATUS_COLOR: Record<OfertaStatus, string> = {
  rascunho: "bg-neutral-200 text-neutral-700",
  enviada: "bg-warning-50 text-warning-700",
  aceita: "bg-success-50 text-success-700",
  recusada: "bg-danger-50 text-danger-700",
  expirada: "bg-neutral-200 text-neutral-700",
};

export const OFERTA_STATUS_TONE: Record<OfertaStatus, StatusTone> = {
  rascunho: "neutral",
  enviada: "warning",
  aceita: "success",
  recusada: "danger",
  expirada: "neutral",
};

export type OfertaItem = {
  id: string;
  preco_saca: number;
  bag_count: number | null;
  validade_ate: string | null;
  mensagem: string | null;
  status: OfertaStatus;
  created_at: string;
  comprador_id: string;
  comprador_nome: string;
  lote_id: string | null;
  lote_codigo: string | null;
};

/** Total ofertado = preço/saca × sacas. */
export function ofertaTotal(o: OfertaItem): number | null {
  return o.bag_count != null ? o.preco_saca * o.bag_count : null;
}

/**
 * Ação PRIMÁRIA por status. `decidir` = Aceitar (primário) + Recusar
 * (secundário); `contrato` = gerar contrato; `enviar` = manda o rascunho.
 * Remover é sempre destrutivo, fica no menu "⋯" (não é ação primária).
 */
export type OfferAction =
  | { type: "enviar" }
  | { type: "decidir" }
  | { type: "contrato" }
  | null;

export function nextOfferAction(status: OfertaStatus): OfferAction {
  switch (status) {
    case "rascunho":
      return { type: "enviar" };
    case "enviada":
      return { type: "decidir" };
    case "aceita":
      return { type: "contrato" };
    default:
      return null;
  }
}

export function gerarContratoHref(o: {
  comprador_id: string;
  lote_id: string | null;
  preco_saca: number;
  bag_count: number | null;
}): string {
  const p = new URLSearchParams({ comprador_id: o.comprador_id });
  if (o.lote_id) p.set("lote_id", o.lote_id);
  p.set("preco", String(o.preco_saca));
  if (o.bag_count != null) p.set("bag_count", String(o.bag_count));
  return `/painel/corretora/contratos/novo?${p.toString()}`;
}
