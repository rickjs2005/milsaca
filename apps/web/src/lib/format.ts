/**
 * Formatadores reutilizáveis pra datas, moeda e preços.
 *
 * Convenção:
 *   - Todas as funções aceitam null/undefined sem explodir, devolvendo "—".
 *   - Saída sempre em pt-BR.
 *   - Não fazem timezone math — usam o fuso do servidor/cliente.
 *     Pra timestamps em UTC vindos do banco, isso já produz o horário
 *     local correto via Intl.
 */

/** "20/05/2026" — só data, formato BR curto. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** "20/05/2026 14:32" — data + hora curta. */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * "R$ 1.234,56" — formato moeda BR a partir de cents.
 *
 *   fmtBRL(123456)  → "R$ 1.234,56"
 *   fmtBRL(null)    → "—"
 */
export function fmtBRL(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * "R$ 1.234,56" a partir de valor em reais (não cents). Útil pra colunas
 * que já vêm como numeric do banco. Aceita number ou string numérica.
 */
export function fmtMoney(value: number | string | null | undefined): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Preço de plano com sufixo de periodicidade.
 *
 *   formatPriceBR(19900, "monthly") → "R$ 199,00/mês"
 *   formatPriceBR(238800, "yearly") → "R$ 2.388,00/ano"
 */
export function formatPriceBR(
  cents: number,
  period: "monthly" | "yearly",
): string {
  return `${fmtBRL(cents)}/${period === "yearly" ? "ano" : "mês"}`;
}

/**
 * "há 3h", "há 2 dias", "há 5 min". Pra timestamps recentes em pt-BR.
 *
 *   timeAgo(iso) → "há 3h"
 *   timeAgo(null) → "—"
 *
 * Granularidade:
 *   < 1min   → "agora"
 *   < 60min  → "há Xmin"
 *   < 24h    → "há Xh"
 *   < 30d    → "há X dia(s)"
 *   senão    → "há X meses"
 */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  let ms: number;
  try {
    ms = Date.now() - new Date(iso).getTime();
  } catch {
    return "—";
  }
  if (!Number.isFinite(ms) || ms < 0) return "agora";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `há ${days} ${days === 1 ? "dia" : "dias"}`;
  const months = Math.floor(days / 30);
  return `há ${months} ${months === 1 ? "mês" : "meses"}`;
}
