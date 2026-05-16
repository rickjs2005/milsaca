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

export type CotacoesFilter = {
  specie?: CoffeeSpecie;
  process?: CoffeeProcesso;
};

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
  const rows = (data ?? []) as Omit<CotacaoRow, "variacao_pct">[];

  // Variação % vs cotação anterior da mesma chave (specie + process + region).
  // Itera ascendente pra ter "anterior" antes do atual.
  const lastByKey = new Map<string, number>();
  const variation = new Map<string, number | null>();
  for (const r of [...rows].reverse()) {
    const key = [r.specie ?? r.coffee_type, r.process ?? "", r.region ?? ""].join("|");
    const prev = lastByKey.get(key);
    const price = Number(r.price);
    variation.set(
      r.id,
      prev != null && prev > 0 ? ((price - prev) / prev) * 100 : null,
    );
    lastByKey.set(key, price);
  }

  return rows.map((r) => ({
    ...r,
    price: Number(r.price),
    variacao_pct: variation.get(r.id) ?? null,
  }));
}
