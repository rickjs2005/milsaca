import { createClient } from "@milsaca/db/web/server";
import type { CoffeeProcesso, CoffeeSpecie } from "@milsaca/types";

export type CotacaoRow = {
  id: string;
  coffee_type: string;
  specie: CoffeeSpecie | null;
  process: CoffeeProcesso | null;
  region: string | null;
  price: number;
  source: string | null;
  reference_date: string;
  created_at: string;
  variacao_pct: number | null;
};

export type CotacoesFilter = { specie?: CoffeeSpecie };

function groupKey(r: {
  specie: string | null;
  process: string | null;
  coffee_type: string;
  region: string | null;
}) {
  return [r.specie ?? r.coffee_type, r.process ?? "", r.region ?? ""].join("|");
}

export async function listCotacoes(
  filter: CotacoesFilter = {},
): Promise<CotacaoRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("cotacoes")
    .select(
      "id, coffee_type, specie, process, region, price, source, reference_date, created_at",
    )
    .order("reference_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);

  if (filter.specie) q = q.eq("specie", filter.specie);

  const { data } = await q;
  const rows = (data ?? []) as Omit<CotacaoRow, "variacao_pct">[];

  // calcula variação por chave de grupo, em ordem cronológica ascendente
  const lastByKey = new Map<string, number>();
  const variation = new Map<string, number | null>();
  for (const r of [...rows].reverse()) {
    const k = groupKey(r);
    const prev = lastByKey.get(k);
    const price = Number(r.price);
    variation.set(
      r.id,
      prev != null && prev > 0 ? ((price - prev) / prev) * 100 : null,
    );
    lastByKey.set(k, price);
  }

  return rows.map((r) => ({
    ...r,
    price: Number(r.price),
    variacao_pct: variation.get(r.id) ?? null,
  }));
}

export type CotacaoCard = {
  key: string;
  specie: CoffeeSpecie | null;
  process: CoffeeProcesso | null;
  coffee_type: string;
  region: string | null;
  current_price: number;
  current_date: string;
  variacao_pct: number | null;
  source: string | null;
  /** série dos últimos preços (cronológica asc) para sparkline */
  series: number[];
};

/**
 * Agrupa cotações por (specie, process, region) e retorna 1 card por par,
 * com a cotação mais recente, variação % vs a cotação imediatamente anterior
 * do mesmo grupo, e a série dos últimos N preços pra sparkline.
 */
export function agruparCotacoes(
  rows: CotacaoRow[],
  serieMax = 10,
): CotacaoCard[] {
  // agrupa
  const groups = new Map<string, CotacaoRow[]>();
  for (const r of rows) {
    const k = groupKey(r);
    const arr = groups.get(k) ?? [];
    arr.push(r);
    groups.set(k, arr);
  }

  const cards: CotacaoCard[] = [];
  for (const [k, list] of groups) {
    // ordena desc por data dentro do grupo
    list.sort((a, b) => {
      const c = b.reference_date.localeCompare(a.reference_date);
      return c !== 0 ? c : b.created_at.localeCompare(a.created_at);
    });
    const [current, previous] = list;
    if (!current) continue;
    const variacao =
      previous && previous.price > 0
        ? ((current.price - previous.price) / previous.price) * 100
        : null;
    // série em ordem cronológica ascendente, limitada
    const series = list
      .slice(0, serieMax)
      .map((r) => r.price)
      .reverse();
    cards.push({
      key: k,
      specie: current.specie,
      process: current.process,
      coffee_type: current.coffee_type,
      region: current.region,
      current_price: current.price,
      current_date: current.reference_date,
      variacao_pct: variacao,
      source: current.source,
      series,
    });
  }

  // ordena cards por (specie alfabética, process alfabético, region)
  cards.sort((a, b) => {
    const sa = a.specie ?? a.coffee_type;
    const sb = b.specie ?? b.coffee_type;
    if (sa !== sb) return sa.localeCompare(sb);
    const pa = a.process ?? "";
    const pb = b.process ?? "";
    if (pa !== pb) return pa.localeCompare(pb);
    return (a.region ?? "").localeCompare(b.region ?? "");
  });

  return cards;
}
