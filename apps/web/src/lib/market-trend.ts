import { createClient } from "@milsaca/db/web/server";

export type MarketTrendDir = "alta" | "estavel" | "baixa";

export type MarketTrend = {
  direction: MarketTrendDir;
  /** Variação no período escolhido (ou variação de 1 dia no fallback "hoje"). */
  pct: number | null;
  /** Rótulo do período usado: "30 dias" | "7 dias" | "hoje". */
  label: string;
  /** Série de preços do histórico, do mais antigo pro mais novo (alimenta o Sparkline). */
  series: number[];
};

type HistoryRow = {
  symbol: string;
  captured_date: string;
  price_brl_cents: number | null;
  price_usd_cents: number | null;
  variation_pct: number | null;
};

type Point = { date: string; price: number; variation_pct: number | null };

const DAY_MS = 86_400_000;

/** Preço do registro em centavos: prefere BRL, cai pra USD. `null` se não houver. */
function priceOf(row: HistoryRow): number | null {
  const raw = row.price_brl_cents ?? row.price_usd_cents;
  if (raw == null) return null;
  return Number(raw);
}

function directionFor(pct: number | null): MarketTrendDir {
  if (pct == null) return "estavel";
  if (Math.abs(pct) < 1.5) return "estavel";
  return pct >= 1.5 ? "alta" : "baixa";
}

/**
 * Calcula a tendência de mercado por símbolo a partir do histórico de cotações.
 *
 * Tenta janela de 30 dias; se não houver intervalo real, cai pra 7 dias; e por
 * fim usa a variação diária (`variation_pct`) do último registro como fallback.
 */
export async function loadMarketTrend(
  symbols: string[],
): Promise<Record<string, MarketTrend>> {
  if (symbols.length === 0) return {};

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("market_quotes_history")
    .select(
      "symbol, captured_date, price_brl_cents, price_usd_cents, variation_pct",
    )
    .in("symbol", symbols)
    .order("captured_date", { ascending: true });

  if (error || !data) return {};

  const rows = data as HistoryRow[];

  // Agrupa pontos com preço por símbolo, mantendo a ordem crescente de data.
  const bySymbol = new Map<string, Point[]>();
  for (const row of rows) {
    const price = priceOf(row);
    if (price == null) continue;
    const list = bySymbol.get(row.symbol) ?? [];
    list.push({
      date: row.captured_date,
      price,
      variation_pct: row.variation_pct,
    });
    bySymbol.set(row.symbol, list);
  }

  const result: Record<string, MarketTrend> = {};

  for (const [symbol, points] of bySymbol) {
    if (points.length === 0) continue;

    const latest = points[points.length - 1]!;
    const latestDate = new Date(latest.date + "T00:00:00Z");

    // Variação até `latest` a partir do primeiro ponto com data >= (latest − nDays).
    const trendFor = (nDays: number): number | null => {
      const cutoff = latestDate.getTime() - nDays * DAY_MS;
      const base = points.find(
        (p) => new Date(p.date + "T00:00:00Z").getTime() >= cutoff,
      );
      if (!base || base.date === latest.date) return null;
      return ((latest.price - base.price) / base.price) * 100;
    };

    let pct = trendFor(30);
    let label = "30 dias";

    if (pct == null) {
      pct = trendFor(7);
      label = "7 dias";
    }

    if (pct == null) {
      pct = latest.variation_pct;
      label = "hoje";
    }

    result[symbol] = {
      direction: directionFor(pct),
      pct,
      label,
      series: points.map((p) => p.price),
    };
  }

  return result;
}
