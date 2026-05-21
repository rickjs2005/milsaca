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
