import { createClient } from "@milsaca/db/web/server";
import type { CoffeeSpecie } from "@milsaca/types";
import { cotacaoKey } from "./cotacao-meta";
import type { CotacaoRow, CotacoesFilter } from "./cotacao-meta";

// Re-export da meta pura pra quem importa de queries continuar funcionando.
export type { CotacaoRow, CotacoesFilter } from "./cotacao-meta";

export async function listCotacoes(
  corretoraId: string,
  filter: CotacoesFilter = {},
): Promise<CotacaoRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("cotacoes")
    .select(
      "id, coffee_type, specie, process, region, price, source, reference_date, created_at",
    )
    // Escopo de tenant: "Suas cotações manuais" são da PRÓPRIA corretora. Sem
    // isso, a lista (e o cálculo de vigente/variação por praça) misturava
    // cotações de outras corretoras — a RLS de SELECT é aberta (feed do produtor).
    .eq("corretora_id", corretoraId)
    .order("reference_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (filter.specie) q = q.eq("specie", filter.specie);
  if (filter.process) q = q.eq("process", filter.process);

  const { data } = await q;
  const rows = (data ?? []) as Omit<
    CotacaoRow,
    "variacao_pct" | "variacao_base" | "vigente"
  >[];

  // Variação % vs cotação anterior da mesma praça (café+processo+praça).
  // Itera ascendente pra ter "anterior" antes do atual; guarda data da base.
  const lastByKey = new Map<string, { price: number; date: string }>();
  const variation = new Map<string, number | null>();
  const base = new Map<string, string | null>();
  for (const r of [...rows].reverse()) {
    const key = cotacaoKey(r);
    const prev = lastByKey.get(key);
    const price = Number(r.price);
    variation.set(
      r.id,
      prev && prev.price > 0 ? ((price - prev.price) / prev.price) * 100 : null,
    );
    base.set(r.id, prev?.date ?? null);
    lastByKey.set(key, { price, date: r.reference_date });
  }

  // Vigente = mais recente de cada praça. `rows` já vem DESC, então a primeira
  // ocorrência de cada chave é a atual (a que o produtor vê hoje).
  const vigentes = new Set<string>();
  const seen = new Set<string>();
  for (const r of rows) {
    const key = cotacaoKey(r);
    if (!seen.has(key)) {
      seen.add(key);
      vigentes.add(r.id);
    }
  }

  return rows.map((r) => ({
    ...r,
    price: Number(r.price),
    variacao_pct: variation.get(r.id) ?? null,
    variacao_base: base.get(r.id) ?? null,
    vigente: vigentes.has(r.id),
  }));
}

export type CotacaoUltima = {
  price: number;
  reference_date: string;
  region: string | null;
} | null;

export type CotacoesKpis = {
  arabica: CotacaoUltima;
  conillon: CotacaoUltima;
  /** Total de cotações manuais cadastradas. */
  total: number;
  /** Data de referência mais recente (qualquer espécie). */
  ultimaData: string | null;
  /** Dias desde a cotação mais recente — sinal de frescor. `null` se vazio. */
  diasDesdeUltima: number | null;
};

/** Última cotação registrada de uma espécie (mais recente por data + criação). */
async function ultimaPorEspecie(
  supabase: Awaited<ReturnType<typeof createClient>>,
  specie: CoffeeSpecie,
  corretoraId: string,
): Promise<CotacaoUltima> {
  const { data } = await supabase
    .from("cotacoes")
    .select("price, reference_date, region")
    .eq("corretora_id", corretoraId)
    .eq("specie", specie)
    .order("reference_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    price: Number(data.price),
    reference_date: data.reference_date,
    region: data.region ?? null,
  };
}

function diasDesde(iso: string): number {
  const [y = 0, m = 1, d = 1] = iso.slice(0, 10).split("-").map(Number);
  const ref = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((today - ref) / 86_400_000);
}

export async function loadCotacoesKpis(
  corretoraId: string,
): Promise<CotacoesKpis> {
  const supabase = await createClient();
  const [arabica, conillon, totalRes] = await Promise.all([
    ultimaPorEspecie(supabase, "arabica", corretoraId),
    ultimaPorEspecie(supabase, "conillon", corretoraId),
    supabase
      .from("cotacoes")
      .select("id", { count: "exact", head: true })
      .eq("corretora_id", corretoraId),
  ]);

  const datas = [arabica?.reference_date, conillon?.reference_date].filter(
    (d): d is string => Boolean(d),
  );
  const ultimaData = datas.length
    ? datas.reduce((a, b) => (a > b ? a : b))
    : null;

  return {
    arabica,
    conillon,
    total: totalRes.count ?? 0,
    ultimaData,
    diasDesdeUltima: ultimaData ? diasDesde(ultimaData) : null,
  };
}

// ---------------------------------------------------------------------------
// Inteligência competitiva (#6): onde a cotação da corretora se posiciona
// frente às outras corretoras (mesma espécie). A RLS deixa ler cotações
// active/stale de todas — é o mesmo dado que o produtor compara.
// ---------------------------------------------------------------------------
export type PosicaoEspecie = {
  /** Posição (1 = melhor oferta / maior preço pro produtor). */
  rank: number;
  /** Quantas corretoras têm cotação dessa espécie. */
  total: number;
  /** Quanto a cotação da corretora está acima/abaixo da média do mercado. */
  deltaVsMediaPct: number | null;
} | null;

export type PosicaoMercado = {
  arabica: PosicaoEspecie;
  conillon: PosicaoEspecie;
};

async function posicaoEspecie(
  supabase: Awaited<ReturnType<typeof createClient>>,
  specie: CoffeeSpecie,
  corretoraId: string,
): Promise<PosicaoEspecie> {
  const { data } = await supabase
    .from("cotacoes")
    .select("price, corretora_id, reference_date, created_at")
    .eq("specie", specie)
    .in("status", ["active", "stale"])
    .order("reference_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1000);

  const rows = (data ?? []) as {
    price: number | string;
    corretora_id: string;
  }[];

  // Linhas já vêm da mais recente pra mais antiga → 1ª de cada corretora = atual.
  const latest = new Map<string, number>();
  for (const r of rows) {
    if (!latest.has(r.corretora_id)) latest.set(r.corretora_id, Number(r.price));
  }

  const minha = latest.get(corretoraId);
  if (minha == null) return null;
  const prices = [...latest.values()];
  const total = prices.length;
  if (total < 2) return null; // sem comparação não há posição

  const rank = 1 + prices.filter((p) => p > minha).length;
  const media = prices.reduce((s, p) => s + p, 0) / total;
  const deltaVsMediaPct = media > 0 ? ((minha - media) / media) * 100 : null;
  return { rank, total, deltaVsMediaPct };
}

export async function loadPosicaoMercado(
  corretoraId: string,
): Promise<PosicaoMercado> {
  const supabase = await createClient();
  const [arabica, conillon] = await Promise.all([
    posicaoEspecie(supabase, "arabica", corretoraId),
    posicaoEspecie(supabase, "conillon", corretoraId),
  ]);
  return { arabica, conillon };
}
