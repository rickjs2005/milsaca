import { createClient } from "@milsaca/db/web/server";
import type { Lote } from "@milsaca/types";

// Re-exports dos metadados puros — pra clients antigos que importam de queries.
export {
  LOTE_STATUS_ORDER,
  LOTE_STATUS_LABEL,
  LOTE_STATUS_COLOR,
  LOTE_STATUS_ACTIVE,
  SPECIE_LABEL,
  PROCESSO_LABEL,
} from "./lote-meta";
export type { LoteStatus, LoteRow, ProdutorOption } from "./lote-meta";

import type { LoteRow, ProdutorOption } from "./lote-meta";

export type LoteListFilter = {
  status?: Lote["status"];
  specie?: "arabica" | "conillon";
};

export const LOTES_PAGE_SIZE = 24;

export async function listLotes(
  corretoraId: string,
  filter: LoteListFilter = {},
  page = 1,
): Promise<{ rows: LoteRow[]; count: number }> {
  if (!corretoraId) return { rows: [], count: 0 };
  const supabase = await createClient();
  const from = (page - 1) * LOTES_PAGE_SIZE;
  const to = from + LOTES_PAGE_SIZE - 1;

  let q = supabase
    .from("lotes")
    .select(
      `id, codigo, specie, processo, safra, peso_sacas, status, created_at, updated_at,
       produtor:profiles!lotes_produtor_id_fkey(id, full_name, phone, produtores(city, state, fazenda_nome)),
       classificacoes_cob(tipo, fora_de_tipo, created_at, anulada)`,
      { count: "exact" },
    )
    .eq("corretora_id", corretoraId)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (filter.status) q = q.eq("status", filter.status);
  if (filter.specie) q = q.eq("specie", filter.specie);

  const { data, count, error } = await q;
  if (error) {
    console.error("listLotes:", error.message);
    return { rows: [], count: 0 };
  }

  type ProdExt = {
    city: string | null;
    state: string | null;
    fazenda_nome: string | null;
  };
  type Raw = {
    id: string;
    codigo: string;
    specie: "arabica" | "conillon";
    processo: string | null;
    safra: string | null;
    peso_sacas: number | null;
    status: Lote["status"];
    created_at: string;
    updated_at: string;
    produtor:
      | {
          id: string;
          full_name: string | null;
          phone: string | null;
          produtores: ProdExt | ProdExt[] | null;
        }
      | {
          id: string;
          full_name: string | null;
          phone: string | null;
          produtores: ProdExt | ProdExt[] | null;
        }[]
      | null;
    classificacoes_cob: Array<{
      tipo: string | null;
      fora_de_tipo: boolean;
      created_at: string;
      anulada: boolean;
    }> | null;
  };

  function pickOne<T>(v: T | T[] | null | undefined): T | null {
    if (v == null) return null;
    return Array.isArray(v) ? (v[0] ?? null) : v;
  }

  const rows = (data ?? []) as Raw[];
  const mapped = rows.map((r): LoteRow => {
    const prod = pickOne(r.produtor);
    const prodExt = prod ? pickOne(prod.produtores) : null;
    const vigente = (r.classificacoes_cob ?? [])
      .filter((c) => !c.anulada)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return {
      id: r.id,
      codigo: r.codigo,
      specie: r.specie,
      processo: r.processo as Lote["processo"],
      safra: r.safra,
      peso_sacas: r.peso_sacas != null ? Number(r.peso_sacas) : null,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      produtor_id: prod?.id ?? null,
      produtor_nome: prod?.full_name ?? "Sem produtor",
      produtor_phone: prod?.phone ?? null,
      fazenda: prodExt?.fazenda_nome ?? null,
      city: prodExt?.city ?? null,
      state: prodExt?.state ?? null,
      ultimo_tipo: vigente?.tipo ?? null,
      ultimo_fora_de_tipo: vigente?.fora_de_tipo ?? false,
    };
  });

  return { rows: mapped, count: count ?? 0 };
}

export async function listProdutores(): Promise<ProdutorOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, roles")
    .order("full_name", { ascending: true });

  type Raw = {
    id: string;
    full_name: string | null;
    roles: string[] | null;
  };

  const rows = (data ?? []) as Raw[];
  return rows
    .filter((r) => (r.roles ?? []).includes("produtor"))
    .map((r) => ({ id: r.id, nome: r.full_name ?? "Sem nome" }));
}

/**
 * Cotações de referência por specie pra mostrar nos cards (preço/saca
 * comparável). Última cotação registrada por arabica/conillon.
 */
export type CotacaoRef = {
  specie: "arabica" | "conillon";
  price: number;
  source: string | null;
};

export async function loadCotacoesRef(): Promise<CotacaoRef[]> {
  const supabase = await createClient();
  const queries = await Promise.all(
    (["arabica", "conillon"] as const).map((t) =>
      supabase
        .from("cotacoes")
        .select("coffee_type, price, source, reference_date")
        .eq("coffee_type", t)
        .order("reference_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ),
  );

  const out: CotacaoRef[] = [];
  for (const { data } of queries) {
    if (!data) continue;
    const r = data as {
      coffee_type: "arabica" | "conillon";
      price: number;
      source: string | null;
    };
    out.push({
      specie: r.coffee_type,
      price: Number(r.price),
      source: r.source,
    });
  }
  return out;
}

/**
 * KPIs do header da página de lotes — independentes do filtro atual.
 */
export type LotesKpis = {
  ativos: number;
  sacasDisponiveis: number;
  classificados: number;
  vendidosMes: number;
};

export async function loadLotesKpis(corretoraId: string): Promise<LotesKpis> {
  if (!corretoraId) {
    return { ativos: 0, sacasDisponiveis: 0, classificados: 0, vendidosMes: 0 };
  }
  const supabase = await createClient();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthIso = monthStart.toISOString();

  const ATIVOS = [
    "aguardando_classificacao",
    "classificado",
    "fora_de_tipo",
    "rebeneficiar",
  ];

  const [ativosRows, classificados, vendidosMes] = await Promise.all([
    supabase
      .from("lotes")
      .select("peso_sacas")
      .eq("corretora_id", corretoraId)
      .in("status", ATIVOS),
    supabase
      .from("lotes")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("status", "classificado"),
    supabase
      .from("lotes")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("status", "vendido")
      .gte("updated_at", monthIso),
  ]);

  const ativosData = (ativosRows.data ?? []) as Array<{
    peso_sacas: number | string | null;
  }>;
  const sacasDisponiveis = ativosData.reduce(
    (sum, r) => sum + (r.peso_sacas != null ? Number(r.peso_sacas) : 0),
    0,
  );

  return {
    ativos: ativosData.length,
    sacasDisponiveis,
    classificados: classificados.count ?? 0,
    vendidosMes: vendidosMes.count ?? 0,
  };
}
