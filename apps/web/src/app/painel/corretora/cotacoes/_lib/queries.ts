import { createClient } from "@milsaca/db/web/server";
import type { CoffeeSpecie } from "@milsaca/types";
import { cotacaoKey } from "./cotacao-meta";
import type { CotacaoRow, CotacoesFilter } from "./cotacao-meta";

// Re-export da meta pura pra quem importa de queries continuar funcionando.
export type { CotacaoRow, CotacoesFilter } from "./cotacao-meta";

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
): Promise<CotacaoUltima> {
  const { data } = await supabase
    .from("cotacoes")
    .select("price, reference_date, region")
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

export async function loadCotacoesKpis(): Promise<CotacoesKpis> {
  const supabase = await createClient();
  const [arabica, conillon, totalRes] = await Promise.all([
    ultimaPorEspecie(supabase, "arabica"),
    ultimaPorEspecie(supabase, "conillon"),
    supabase.from("cotacoes").select("id", { count: "exact", head: true }),
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
