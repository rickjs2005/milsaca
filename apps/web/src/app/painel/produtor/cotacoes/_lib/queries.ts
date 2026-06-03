import { createClient } from "@milsaca/db/web/server";
import type { CoffeeProcesso, CoffeeSpecie } from "@milsaca/types";

// =================================================================
// Tipos
// =================================================================

type CotacaoRow = {
  id: string;
  coffee_type: string;
  specie: CoffeeSpecie | null;
  process: CoffeeProcesso | null;
  region: string | null;
  region_id: string | null;
  price: number;
  source: string | null;
  reference_date: string;
  created_at: string;
  status: "active" | "stale" | "error" | "hidden";
  corretora_id: string;
  corretora_name: string | null;
  variacao_pct: number | null;
};

export type CotacoesFilter = {
  specie?: CoffeeSpecie;
  praca?: string;
};

export type CotacaoCard = {
  key: string;
  specie: CoffeeSpecie | null;
  process: CoffeeProcesso | null;
  coffee_type: string;
  region: string | null;
  corretora_id: string;
  corretora_name: string | null;
  current_price: number;
  current_date: string;
  variacao_pct: number | null;
  variacao_7d_pct: number | null;
  variacao_30d_pct: number | null;
  source: string | null;
  status: CotacaoRow["status"];
  series: number[];
};

export type MarketIndicator = {
  source: string;
  symbol: string;
  label: string;
  sublabel: string;
  price: number | null;
  currency: "BRL" | "USD";
  variation_pct: number | null;
  fetched_at: string;
  stale: boolean;
};

export type ProdutorCotacoesData = {
  market: MarketIndicator[];
  minhasCorretoras: CotacaoCard[];
  outrasPracas: CotacaoCard[];
  pracasDisponiveis: { slug: string; name: string; state: string }[];
  favoritosCorretoraIds: string[];
};

// =================================================================
// Helpers
// =================================================================

function groupKey(r: {
  specie: string | null;
  process: string | null;
  coffee_type: string;
  region: string | null;
  corretora_id: string;
}) {
  return [
    r.corretora_id,
    r.specie ?? r.coffee_type,
    r.process ?? "",
    r.region ?? "",
  ].join("|");
}

function calcVariacao(current: number, previous: number | null): number | null {
  if (previous == null || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

const MARKET_INDICATORS = [
  {
    source: "cepea_esalq",
    symbol: "arabica_bica_corrida_esalq",
    label: "Arábica CEPEA/ESALQ",
    sublabel: "Bica corrida · saca 60kg",
  },
  {
    source: "cepea_esalq",
    symbol: "conilon_es_esalq",
    label: "Conilon CEPEA",
    sublabel: "Espírito Santo · saca 60kg",
  },
  {
    source: "ice_us",
    symbol: "KC.F",
    label: "Bolsa de Nova York (ICE)",
    sublabel: "Arábica · influencia o preço no Brasil",
  },
  {
    source: "bcb_ptax",
    symbol: "USDBRL",
    label: "Dólar (PTAX)",
    sublabel: "Banco Central",
  },
];

// =================================================================
// Bloco B — Carrega tudo que o produtor precisa em 1 chamada
// =================================================================

export async function loadProdutorCotacoes(
  filter: CotacoesFilter & { produtorId: string },
): Promise<ProdutorCotacoesData> {
  const supabase = await createClient();

  // 1. Favoritos do produtor (corretoras "minhas")
  const { data: favRows } = await supabase
    .from("favoritos")
    .select("corretora_id")
    .eq("produtor_id", filter.produtorId);

  const favoritosCorretoraIds = (favRows ?? []).map(
    (r) => (r as { corretora_id: string }).corretora_id,
  );

  // 2. Cotações ativas/stale (todas as corretoras)
  let q = supabase
    .from("cotacoes")
    .select(
      "id, coffee_type, specie, process, region, region_id, price, source, reference_date, created_at, status, corretora_id, corretoras(name)",
    )
    .in("status", ["active", "stale"])
    .order("reference_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (filter.specie) q = q.eq("specie", filter.specie);

  const { data } = await q;

  type RawRow = {
    id: string;
    coffee_type: string;
    specie: CoffeeSpecie | null;
    process: CoffeeProcesso | null;
    region: string | null;
    region_id: string | null;
    price: number;
    source: string | null;
    reference_date: string;
    created_at: string;
    status: CotacaoRow["status"];
    corretora_id: string;
    corretoras: { name: string } | { name: string }[] | null;
  };

  const allRows = ((data ?? []) as unknown as RawRow[]).map(
    (r): CotacaoRow => ({
      ...r,
      price: Number(r.price),
      corretora_name: Array.isArray(r.corretoras)
        ? r.corretoras[0]?.name ?? null
        : r.corretoras?.name ?? null,
      variacao_pct: null,
    }),
  );

  // 3. Filtro por praça (slug → match em region_id OU region label)
  let filtered = allRows;
  if (filter.praca) {
    const { data: praca } = await supabase
      .from("pracas")
      .select("id, name, state")
      .eq("slug", filter.praca)
      .maybeSingle();
    if (praca) {
      const p = praca as { id: string; name: string; state: string };
      const pracaLabel = `${p.name}/${p.state}`;
      filtered = allRows.filter(
        (r) => r.region_id === p.id || r.region === pracaLabel,
      );
    }
  }

  // 4. Agrupa + calcula variações (anterior, 7d, 30d)
  const grouped = new Map<string, CotacaoRow[]>();
  for (const r of filtered) {
    const k = groupKey(r);
    const arr = grouped.get(k) ?? [];
    arr.push(r);
    grouped.set(k, arr);
  }

  const cards: CotacaoCard[] = [];
  for (const [k, list] of grouped) {
    list.sort((a, b) => {
      const c = b.reference_date.localeCompare(a.reference_date);
      return c !== 0 ? c : b.created_at.localeCompare(a.created_at);
    });
    const [current] = list;
    if (!current) continue;
    const currentRow = current;
    const currentMs = new Date(currentRow.reference_date).getTime();

    const priceAtOrBefore = (daysAgo: number): number | null => {
      const targetMs = currentMs - daysAgo * 86400_000;
      const found = list.find(
        (r) =>
          r.id !== currentRow.id &&
          new Date(r.reference_date).getTime() <= targetMs,
      );
      return found ? found.price : null;
    };

    const previous = list[1] ?? null;
    const series = list.slice(0, 10).map((r) => r.price).reverse();

    cards.push({
      key: k,
      specie: current.specie,
      process: current.process,
      coffee_type: current.coffee_type,
      region: current.region,
      corretora_id: current.corretora_id,
      corretora_name: current.corretora_name,
      current_price: current.price,
      current_date: current.reference_date,
      variacao_pct: previous ? calcVariacao(current.price, previous.price) : null,
      variacao_7d_pct: calcVariacao(current.price, priceAtOrBefore(7)),
      variacao_30d_pct: calcVariacao(current.price, priceAtOrBefore(30)),
      source: current.source,
      status: current.status,
      series,
    });
  }

  // 5. Split: favoritas × outras
  const fav = new Set(favoritosCorretoraIds);
  const minhasCorretoras: CotacaoCard[] = [];
  const outrasPracas: CotacaoCard[] = [];
  for (const c of cards) {
    if (fav.has(c.corretora_id)) minhasCorretoras.push(c);
    else outrasPracas.push(c);
  }

  const sortByCorretoraThenCafe = (a: CotacaoCard, b: CotacaoCard) => {
    const an = a.corretora_name ?? "";
    const bn = b.corretora_name ?? "";
    if (an !== bn) return an.localeCompare(bn);
    const sa = a.specie ?? a.coffee_type;
    const sb = b.specie ?? b.coffee_type;
    if (sa !== sb) return sa.localeCompare(sb);
    return (a.region ?? "").localeCompare(b.region ?? "");
  };
  minhasCorretoras.sort(sortByCorretoraThenCafe);
  outrasPracas.sort(sortByCorretoraThenCafe);

  // 6. Mercado (market_quotes)
  const { data: marketRows } = await supabase
    .from("market_quotes")
    .select(
      "source, symbol, price_brl_cents, price_usd_cents, variation_pct, fetched_at",
    )
    .in(
      "source",
      MARKET_INDICATORS.map((m) => m.source),
    );

  type MarketRow = {
    source: string;
    symbol: string;
    price_brl_cents: number | null;
    price_usd_cents: number | null;
    variation_pct: number | string | null;
    fetched_at: string;
  };

  const marketMap = new Map<string, MarketRow>();
  for (const r of (marketRows ?? []) as MarketRow[]) {
    marketMap.set(`${r.source}|${r.symbol}`, r);
  }

  const STALE_MS = 48 * 3600_000;
  const market: MarketIndicator[] = MARKET_INDICATORS.map((spec) => {
    const r = marketMap.get(`${spec.source}|${spec.symbol}`);
    if (!r)
      return {
        source: spec.source,
        symbol: spec.symbol,
        label: spec.label,
        sublabel: spec.sublabel,
        price: null,
        currency: "BRL" as const,
        variation_pct: null,
        fetched_at: "",
        stale: true,
      };
    const isBRL = r.price_brl_cents != null;
    const price = isBRL
      ? r.price_brl_cents! / 100
      : r.price_usd_cents != null
        ? r.price_usd_cents / 100
        : null;
    const ageMs = Date.now() - new Date(r.fetched_at).getTime();
    return {
      source: spec.source,
      symbol: spec.symbol,
      label: spec.label,
      sublabel: spec.sublabel,
      price,
      currency: (isBRL ? "BRL" : "USD") as "BRL" | "USD",
      variation_pct:
        r.variation_pct != null ? Number(r.variation_pct) : null,
      fetched_at: r.fetched_at,
      stale: ageMs > STALE_MS,
    };
  });

  // 7. Praças ativas pra filtro
  const { data: pracas } = await supabase
    .from("pracas")
    .select("slug, name, state")
    .eq("active", true)
    .order("state", { ascending: true })
    .order("name", { ascending: true });

  return {
    market,
    minhasCorretoras,
    outrasPracas,
    pracasDisponiveis: (pracas ?? []) as {
      slug: string;
      name: string;
      state: string;
    }[],
    favoritosCorretoraIds,
  };
}
