import type { StatusTone } from "@/components/status-badge";

/**
 * META PURA da tela de Compradores da corretora.
 *
 * SÓ tipos, constantes, mapas de label/tone e funções puras. NÃO importa
 * `@milsaca/db/...` nem nada server-only — consumida por client components.
 *
 * Domínio: compradores são PJ (indústria/exportador/trading/torrefador/
 * cooperativa) que compram o café intermediado pela corretora. É o lado de
 * SAÍDA da venda — onde está o dinheiro de fechamento. Espelha a tela de
 * Produtores, mas com foco em volume COMPRADO (R$) e, no detalhe, perfil de
 * compra (matching oferta↔comprador).
 */

/**
 * Item da lista de compradores. Espelha o que `queries.ts` produz, com a
 * densidade financeira já agregada (contratos + valor comprado + recência).
 *
 * NOTA: este tipo é a fonte canônica. `queries.ts` importa daqui.
 */
export type CompradorListItem = {
  id: string;
  name: string;
  trade_name: string | null;
  cnpj: string | null;
  city: string | null;
  state: string | null;
  /** Valor cru do tipo (ver TIPO_LABEL). */
  tipo: string | null;
  ativo: boolean;
  contact_phone: string | null;
  /** Contratos com este comprador (qualquer status). */
  qtd_contratos: number;
  /** Contratos fechados (ativo + finalizado) — base do volume comprado. */
  qtd_fechados: number;
  /** Soma de contratos.total_value dos fechados (R$ comprado). */
  valor_comprado: number;
  /** Data (ISO) do contrato fechado mais recente — recência comercial. */
  last_compra: string | null;
};

// ---------------------------------------------------------------------------
// Tipo de comprador (segmento) — cor por segmento pro matching visual
// ---------------------------------------------------------------------------

export const TIPO_LABEL: Record<string, string> = {
  industria: "Indústria",
  exportador: "Exportador",
  trading: "Trading",
  torrefador: "Torrefador",
  cooperativa: "Cooperativa",
  outro: "Outro",
};

const TIPO_TONE: Record<string, StatusTone> = {
  torrefador: "premium",
  exportador: "info",
  trading: "warning",
  industria: "success",
  cooperativa: "neutral",
  outro: "neutral",
};

export function tipoLabel(tipo: string | null): string | null {
  if (!tipo) return null;
  return TIPO_LABEL[tipo] ?? tipo;
}

export function tipoTone(tipo: string | null): StatusTone {
  if (!tipo) return "neutral";
  return TIPO_TONE[tipo] ?? "neutral";
}

/** Filtro de TIPO (pills desktop + FilterSheet mobile). */
export const TIPO_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "torrefador", label: "Torrefador" },
  { value: "exportador", label: "Exportador" },
  { value: "trading", label: "Trading" },
  { value: "industria", label: "Indústria" },
  { value: "cooperativa", label: "Cooperativa" },
  { value: "outro", label: "Outro" },
];

/** Filtro de STATUS. */
export const STATUS_FILTERS: { value: "" | "ativo" | "inativo"; label: string }[] =
  [
    { value: "", label: "Todos" },
    { value: "ativo", label: "Ativo" },
    { value: "inativo", label: "Inativo" },
  ];

// ---------------------------------------------------------------------------
// Ordenação
// ---------------------------------------------------------------------------

export type CompradorSortKey = "comprado" | "recente" | "nome";

export const COMPRADOR_SORT_LABEL: Record<CompradorSortKey, string> = {
  comprado: "Mais comprado",
  recente: "Compra recente",
  nome: "Nome (A-Z)",
};

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function formatBRL(value: number): string {
  return BRL_FORMATTER.format(value);
}

export function fmtCnpj(cnpj: string | null): string {
  if (!cnpj || cnpj.length !== 14) return cnpj ?? "—";
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}

export function localLabel(c: Pick<CompradorListItem, "city" | "state">): string | null {
  if (c.city && c.state) return `${c.city} / ${c.state}`;
  return c.city ?? c.state ?? null;
}

/**
 * Recência comercial: traduz a data da última compra fechada em rótulo curto.
 * `warn` quando >= 3 meses sem comprar (oportunidade de reativação).
 * Retorna null quando o comprador nunca fechou contrato.
 */
export function compraRecencia(
  last: string | null,
  nowMs: number,
): { label: string; warn: boolean } | null {
  if (!last) return null;
  const ms = new Date(`${last.slice(0, 10)}T00:00:00`).getTime();
  const days = Math.floor((nowMs - ms) / 86_400_000);
  if (days < 0) return { label: "compra recente", warn: false };
  if (days < 60) {
    return {
      label: `última compra há ${days} ${days === 1 ? "dia" : "dias"}`,
      warn: false,
    };
  }
  const meses = Math.floor(days / 30);
  return { label: `sem comprar há ${meses} meses`, warn: meses >= 3 };
}

// ---------------------------------------------------------------------------
// WhatsApp (contato comercial direto com o comprador)
// ---------------------------------------------------------------------------

/** Normaliza telefone BR pra wa.me (E.164 sem +). null se implausível. */
export function normalizePhoneBR(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length === 12 || digits.length === 13) return digits;
  return null;
}

export function buildBuyerWhatsAppUrl({
  phone,
  compradorNome,
  corretoraNome,
}: {
  phone: string | null;
  compradorNome: string;
  corretoraNome: string;
}): string | null {
  const normalized = normalizePhoneBR(phone);
  if (!normalized) return null;
  const message = [
    `Olá, ${compradorNome}!`,
    "",
    `Aqui é da ${corretoraNome}. Temos café disponível que pode te interessar — posso te enviar as ofertas?`,
  ].join("\n");
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

// ---------------------------------------------------------------------------
// KPIs de carteira (derivados PUROS da lista já carregada)
// ---------------------------------------------------------------------------

export type CompradoresKpis = {
  total: number;
  ativos: number;
  comprado: number;
  ticketMedio: number;
};

export function computeCompradoresKpis(
  items: CompradorListItem[],
): CompradoresKpis {
  let ativos = 0;
  let comprado = 0;
  let fechados = 0;

  for (const c of items) {
    if (c.ativo) ativos += 1;
    comprado += c.valor_comprado;
    fechados += c.qtd_fechados;
  }

  return {
    total: items.length,
    ativos,
    comprado,
    ticketMedio: fechados > 0 ? comprado / fechados : 0,
  };
}
