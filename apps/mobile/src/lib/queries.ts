// Queries do mobile — portadas de apps/web (sem dependência de cookies/next).
// Reusam a tipagem do @milsaca/types e o cliente puro de src/lib/supabase.ts.

import type {
  CoffeeProcesso,
  CoffeeSpecie,
  ContratoStatus,
  LeadStatus,
} from "@milsaca/types";

import { supabase } from "./supabase";
import { logger, safeError } from "./logger";

// ----------------------------------------------------------------- //
// COTAÇÕES
// ----------------------------------------------------------------- //

export interface CotacaoRow {
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
  corretora_id?: string;
  corretora_name?: string | null;
  status?: "active" | "stale" | "error" | "hidden";
}

export interface CotacaoCard {
  key: string;
  specie: CoffeeSpecie | null;
  process: CoffeeProcesso | null;
  coffee_type: string;
  region: string | null;
  current_price: number;
  current_date: string;
  variacao_pct: number | null;
  variacao_7d_pct?: number | null;
  variacao_30d_pct?: number | null;
  source: string | null;
  series: number[];
  corretora_id?: string;
  corretora_name?: string | null;
  status?: "active" | "stale" | "error" | "hidden";
}

export interface MarketIndicator {
  source: string;
  symbol: string;
  label: string;
  sublabel: string;
  price: number | null;
  currency: "BRL" | "USD";
  variation_pct: number | null;
  fetched_at: string;
  stale: boolean;
}

export interface FavoritaSemCotacao {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  verified: boolean;
}

export interface ProdutorCotacoesMobile {
  market: MarketIndicator[];
  minhasCorretoras: CotacaoCard[];
  favoritasSemCotacao: FavoritaSemCotacao[];
  outrasPracas: CotacaoCard[];
}

function groupKey(r: {
  specie: string | null;
  process: string | null;
  coffee_type: string;
  region: string | null;
}) {
  return [r.specie ?? r.coffee_type, r.process ?? "", r.region ?? ""].join("|");
}

export async function listCotacoes(
  filter: { specie?: CoffeeSpecie } = {},
): Promise<CotacaoRow[]> {
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

// Bloco B — Carrega cotações organizadas em 3 seções pra produtor.

const MARKET_INDICATORS_MOBILE = [
  {
    source: "cepea_esalq",
    symbol: "arabica_bica_corrida_esalq",
    label: "Arábica CEPEA",
    sublabel: "Bica corrida · R$/saca 60kg",
  },
  {
    source: "cepea_esalq",
    symbol: "conilon_es_esalq",
    label: "Conilon CEPEA",
    sublabel: "Espírito Santo · R$/saca 60kg",
  },
  {
    source: "ice_us",
    symbol: "KC.F",
    label: "Arábica NY (KC)",
    sublabel: "ICE futuros · US¢/lb",
  },
  {
    source: "bcb_ptax",
    symbol: "USDBRL",
    label: "Dólar PTAX",
    sublabel: "Banco Central",
  },
];

function calcVar(current: number, previous: number | null): number | null {
  if (previous == null || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export async function loadProdutorCotacoesMobile(
  produtorId: string,
  filter: { specie?: CoffeeSpecie } = {},
): Promise<ProdutorCotacoesMobile> {
  // Favoritos
  const { data: favRows } = await supabase
    .from("favoritos")
    .select("corretora_id")
    .eq("produtor_id", produtorId);

  const fav = new Set(
    (favRows ?? []).map((r) => (r as { corretora_id: string }).corretora_id),
  );

  // Cotações
  let q = supabase
    .from("cotacoes")
    .select(
      "id, coffee_type, specie, process, region, price, source, reference_date, created_at, status, corretora_id, corretoras(name)",
    )
    .in("status", ["active", "stale"])
    .order("reference_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);

  if (filter.specie) q = q.eq("specie", filter.specie);

  const { data } = await q;
  type Raw = {
    id: string;
    coffee_type: string;
    specie: CoffeeSpecie | null;
    process: CoffeeProcesso | null;
    region: string | null;
    price: number;
    source: string | null;
    reference_date: string;
    created_at: string;
    status: CotacaoRow["status"];
    corretora_id: string;
    corretoras: { name: string } | { name: string }[] | null;
  };
  const allRows: CotacaoRow[] = ((data ?? []) as unknown as Raw[]).map((r) => ({
    ...r,
    price: Number(r.price),
    corretora_id: r.corretora_id,
    corretora_name: Array.isArray(r.corretoras)
      ? r.corretoras[0]?.name ?? null
      : r.corretoras?.name ?? null,
    variacao_pct: null,
  }));

  // Agrupa por (corretora, specie, process, region)
  function gKey(r: CotacaoRow) {
    return [
      r.corretora_id ?? "",
      r.specie ?? r.coffee_type,
      r.process ?? "",
      r.region ?? "",
    ].join("|");
  }

  const grouped = new Map<string, CotacaoRow[]>();
  for (const r of allRows) {
    const k = gKey(r);
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
    const previous = list[1] ?? null;
    const currentMs = new Date(currentRow.reference_date).getTime();
    const priceAt = (days: number): number | null => {
      const t = currentMs - days * 86400000;
      const found = list.find(
        (r) =>
          r.id !== currentRow.id &&
          new Date(r.reference_date).getTime() <= t,
      );
      return found ? found.price : null;
    };
    cards.push({
      key: k,
      specie: current.specie,
      process: current.process,
      coffee_type: current.coffee_type,
      region: current.region,
      current_price: current.price,
      current_date: current.reference_date,
      variacao_pct: previous ? calcVar(current.price, previous.price) : null,
      variacao_7d_pct: calcVar(current.price, priceAt(7)),
      variacao_30d_pct: calcVar(current.price, priceAt(30)),
      source: current.source,
      series: list.slice(0, 10).map((r) => r.price).reverse(),
      corretora_id: current.corretora_id,
      corretora_name: current.corretora_name,
      status: current.status,
    });
  }

  const minhasCorretoras: CotacaoCard[] = [];
  const outrasPracas: CotacaoCard[] = [];
  for (const c of cards) {
    if (c.corretora_id && fav.has(c.corretora_id)) minhasCorretoras.push(c);
    else outrasPracas.push(c);
  }

  // Favoritas que não têm nenhuma cotação ativa — ainda mostradas em
  // destaque pro produtor saber que a relação tá criada e poder falar
  // por WhatsApp.
  const corretorasComCotacao = new Set(
    minhasCorretoras
      .map((c) => c.corretora_id)
      .filter((id): id is string => !!id),
  );
  const favoritasSemCotacao: FavoritaSemCotacao[] = [];
  const favoritasSemCotacaoIds = [...fav].filter(
    (id) => !corretorasComCotacao.has(id),
  );
  if (favoritasSemCotacaoIds.length > 0) {
    const { data: favCorretoras } = await supabase
      .from("corretoras_publicas")
      .select("id, name, city, state, phone, verified")
      .in("id", favoritasSemCotacaoIds);
    for (const row of (favCorretoras ?? []) as {
      id: string | null;
      name: string | null;
      city: string | null;
      state: string | null;
      phone: string | null;
      verified: boolean | null;
    }[]) {
      if (!row.id || !row.name) continue;
      favoritasSemCotacao.push({
        id: row.id,
        name: row.name,
        city: row.city,
        state: row.state,
        phone: row.phone,
        verified: row.verified ?? false,
      });
    }
    favoritasSemCotacao.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  // Mercado
  const { data: marketRows } = await supabase
    .from("market_quotes")
    .select(
      "source, symbol, price_brl_cents, price_usd_cents, variation_pct, fetched_at",
    )
    .in(
      "source",
      MARKET_INDICATORS_MOBILE.map((m) => m.source),
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
  const market: MarketIndicator[] = MARKET_INDICATORS_MOBILE.map((spec) => {
    const r = marketMap.get(`${spec.source}|${spec.symbol}`);
    if (!r)
      return {
        source: spec.source,
        symbol: spec.symbol,
        label: spec.label,
        sublabel: spec.sublabel,
        price: null,
        currency: "BRL",
        variation_pct: null,
        fetched_at: "",
        stale: true,
      };
    const isBRL = r.price_brl_cents != null;
    const price = isBRL
      ? (r.price_brl_cents as number) / 100
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
      variation_pct: r.variation_pct != null ? Number(r.variation_pct) : null,
      fetched_at: r.fetched_at,
      stale: ageMs > STALE_MS,
    };
  });

  return { market, minhasCorretoras, favoritasSemCotacao, outrasPracas };
}

// ----------------------------------------------------------------- //
// LEADS (negociações)
// ----------------------------------------------------------------- //

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "novo",
  "em_negociacao",
  "convertido",
  "perdido",
  "arquivado",
];

// IMPORTANTE: este wording é a persona PRODUTOR e DEVE bater palavra-por-palavra
// com a fonte única do web em apps/web/src/app/painel/produtor/negociacoes/_lib/
// lead-labels.ts ("Novo/Em negociação/Convertido/Recusado/Arquivado"). O mobile
// não compartilha módulo com o web hoje, então a duplicação é intencional.
// IDEAL FUTURO: extrair para um pacote compartilhado (ex.: @milsaca/labels)
// consumido por web e mobile pra eliminar a duplicação.
export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  em_negociacao: "Em negociação",
  convertido: "Convertido",
  perdido: "Recusado",
  arquivado: "Arquivado",
};

export const LEAD_STATUS_BADGE: Record<LeadStatus, { bg: string; text: string }> = {
  novo:           { bg: "#E0C68A33", text: "#2D3A2E" },
  em_negociacao:  { bg: "#7dd3fc44", text: "#075985" },
  convertido:     { bg: "#86efac44", text: "#065f46" },
  perdido:        { bg: "#fca5a544", text: "#9f1239" },
  arquivado:      { bg: "#cbd5e144", text: "#334155" },
};

export interface LeadItem {
  id: string;
  status: LeadStatus;
  coffee_type: string | null;
  bag_count: number | null;
  proposed_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  corretora_id: string;
  corretora_nome: string;
  corretora_phone: string | null;
  corretora_city: string | null;
}

interface LeadRow {
  id: string;
  status: LeadStatus;
  coffee_type: string | null;
  bag_count: number | null;
  proposed_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  corretora_id: string;
  corretora:
    | { id: string; name: string; phone: string | null; city: string | null }
    | { id: string; name: string; phone: string | null; city: string | null }[]
    | null;
}

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function listMinhasNegociacoes(
  produtorId: string,
  filter: { status?: LeadStatus } = {},
): Promise<LeadItem[]> {
  let q = supabase
    .from("leads")
    .select(
      `id, status, coffee_type, bag_count, proposed_price, notes,
       created_at, updated_at, corretora_id,
       corretora:corretoras!leads_corretora_id_fkey(id, name, phone, city)`,
    )
    .eq("produtor_id", produtorId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (filter.status) q = q.eq("status", filter.status);

  const { data } = await q;
  const rows = (data ?? []) as LeadRow[];

  return rows.map((r): LeadItem => {
    const cor = pickOne(r.corretora);
    return {
      id: r.id,
      status: r.status,
      coffee_type: r.coffee_type,
      bag_count: r.bag_count,
      proposed_price:
        r.proposed_price != null ? Number(r.proposed_price) : null,
      notes: r.notes,
      created_at: r.created_at,
      updated_at: r.updated_at,
      corretora_id: r.corretora_id,
      corretora_nome: cor?.name ?? "—",
      corretora_phone: cor?.phone ?? null,
      corretora_city: cor?.city ?? null,
    };
  });
}

// ----------------------------------------------------------------- //
// CONTRATOS
// ----------------------------------------------------------------- //

export const CONTRATO_STATUS_ORDER: ContratoStatus[] = [
  "rascunho",
  "em_analise",
  "ativo",
  "finalizado",
  "cancelado",
];

export const CONTRATO_STATUS_LABEL: Record<ContratoStatus, string> = {
  rascunho: "Rascunho",
  em_analise: "Em análise",
  ativo: "Ativo",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export const CONTRATO_STATUS_BADGE: Record<
  ContratoStatus,
  { bg: string; text: string }
> = {
  rascunho:    { bg: "#cbd5e144", text: "#334155" },
  em_analise:  { bg: "#E0C68A33", text: "#2D3A2E" },
  ativo:       { bg: "#86efac44", text: "#065f46" },
  finalizado:  { bg: "#2D3A2E", text: "#FAF7F0" },
  cancelado:   { bg: "#fca5a544", text: "#9f1239" },
};

// ----------------------------------------------------------------- //
// STATUS DE PAGAMENTO (financeiro do produtor)
// ----------------------------------------------------------------- //
// Mapas centralizados aqui (ao lado de LEAD/CONTRATO) em vez de inline
// na tela. Espelha o enum `pagamento_status`: pendente/pago/vencido/cancelado.

export const PAGAMENTO_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

export const PAGAMENTO_STATUS_BG: Record<string, string> = {
  pendente: "rgba(224,198,138,0.25)",
  pago: "rgba(134,239,172,0.25)",
  vencido: "rgba(252,165,165,0.25)",
  cancelado: "rgba(203,213,225,0.25)",
};

export const PAGAMENTO_STATUS_FG: Record<string, string> = {
  pendente: "#C9A961",
  pago: "#86efac",
  vencido: "#fca5a5",
  cancelado: "#cbd5e1",
};

// ----------------------------------------------------------------- //
// STATUS DE ENTREGA (logística do produtor)
// ----------------------------------------------------------------- //

export const ENTREGA_STATUS_LABEL: Record<string, string> = {
  programada: "Programada",
  em_transito: "Em trânsito",
  recebida: "Recebida",
  conferida: "Conferida",
  cancelada: "Cancelada",
};

export const ENTREGA_STATUS_BG: Record<string, string> = {
  programada: "rgba(224,198,138,0.25)",
  em_transito: "rgba(125,211,252,0.25)",
  recebida: "rgba(134,239,172,0.25)",
  conferida: "#2D3A2E",
  cancelada: "rgba(203,213,225,0.25)",
};

export const ENTREGA_STATUS_FG: Record<string, string> = {
  programada: "#C9A961",
  em_transito: "#7dd3fc",
  recebida: "#86efac",
  conferida: "#FAF7F0",
  cancelada: "#cbd5e1",
};

export interface ContratoItem {
  id: string;
  code: string;
  status: ContratoStatus;
  coffee_type: string | null;
  bag_count: number | null;
  total_value: number | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  corretora_id: string;
  corretora_nome: string;
  corretora_phone: string | null;
  corretora_city: string | null;
  // Conservação de sacas (o produtor precisa enxergar o saldo).
  sacas_entregues: number;
  sacas_em_transito: number;
  sacas_pendentes: number;
}

interface ContratoRow {
  id: string;
  code: string;
  status: ContratoStatus;
  coffee_type: string | null;
  bag_count: number | null;
  total_value: number | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  corretora_id: string;
  corretora:
    | { id: string; name: string; phone: string | null; city: string | null }
    | { id: string; name: string; phone: string | null; city: string | null }[]
    | null;
}

export async function listMeusContratos(
  produtorId: string,
  filter: { status?: ContratoStatus } = {},
): Promise<ContratoItem[]> {
  let q = supabase
    .from("contratos")
    .select(
      `id, code, status, coffee_type, bag_count, total_value, signed_at,
       created_at, updated_at, corretora_id,
       corretora:corretoras!contratos_corretora_id_fkey(id, name, phone, city)`,
    )
    .eq("produtor_id", produtorId)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (filter.status) q = q.eq("status", filter.status);

  const { data } = await q;
  const rows = (data ?? []) as ContratoRow[];

  // Saldo de sacas por contrato: soma as entregas não-canceladas (a RLS de
  // entregas deixa o produtor ler as próprias). entregue = recebida/conferida;
  // em_transito = programada/em_transito; pendente = contratado - as duas.
  const ids = rows.map((r) => r.id);
  const saldoPorContrato = new Map<
    string,
    { entregue: number; em_transito: number }
  >();
  if (ids.length > 0) {
    const { data: entregas } = await supabase
      .from("entregas")
      .select("contrato_id, bag_count, status")
      .in("contrato_id", ids)
      .neq("status", "cancelada");
    for (const e of (entregas ?? []) as {
      contrato_id: string;
      bag_count: number | null;
      status: string;
    }[]) {
      const cur = saldoPorContrato.get(e.contrato_id) ?? {
        entregue: 0,
        em_transito: 0,
      };
      const n = e.bag_count ?? 0;
      if (e.status === "recebida" || e.status === "conferida") {
        cur.entregue += n;
      } else if (e.status === "programada" || e.status === "em_transito") {
        cur.em_transito += n;
      }
      saldoPorContrato.set(e.contrato_id, cur);
    }
  }

  return rows.map((r): ContratoItem => {
    const cor = pickOne(r.corretora);
    const saldo = saldoPorContrato.get(r.id) ?? { entregue: 0, em_transito: 0 };
    const contratado = r.bag_count ?? 0;
    const pendentes = Math.max(
      contratado - saldo.entregue - saldo.em_transito,
      0,
    );
    return {
      id: r.id,
      code: r.code,
      status: r.status,
      coffee_type: r.coffee_type,
      bag_count: r.bag_count,
      total_value: r.total_value != null ? Number(r.total_value) : null,
      signed_at: r.signed_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
      corretora_id: r.corretora_id,
      corretora_nome: cor?.name ?? "—",
      corretora_phone: cor?.phone ?? null,
      corretora_city: cor?.city ?? null,
      sacas_entregues: saldo.entregue,
      sacas_em_transito: saldo.em_transito,
      sacas_pendentes: pendentes,
    };
  });
}

// ----------------------------------------------------------------- //
// PRODUTOR (fazenda) — pra tela de Perfil
// ----------------------------------------------------------------- //

export interface ProdutorFazenda {
  profile_id: string;
  fazenda_nome: string | null;
  city: string | null;
  state: string | null;
  area_ha: number | null;
  altitude_m: number | null;
}

interface ProdutorRow {
  profile_id: string;
  fazenda_nome: string | null;
  city: string | null;
  state: string | null;
  area_ha: number | string | null;
  altitude_m: number | string | null;
}

export async function getProdutorFazenda(
  userId: string,
): Promise<ProdutorFazenda | null> {
  const { data } = await supabase
    .from("produtores")
    .select("profile_id, fazenda_nome, city, state, area_ha, altitude_m")
    .eq("profile_id", userId)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as ProdutorRow;
  return {
    profile_id: row.profile_id,
    fazenda_nome: row.fazenda_nome,
    city: row.city,
    state: row.state,
    area_ha: row.area_ha != null ? Number(row.area_ha) : null,
    altitude_m: row.altitude_m != null ? Number(row.altitude_m) : null,
  };
}

// ----------------------------------------------------------------- //
// CORRETORAS (vitrine pro produtor)
// ----------------------------------------------------------------- //

export interface CorretoraVitrineItem {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  verified: boolean;
  regioes_atendimento: string[];
  is_favorita: boolean;
  qtd_negociacoes: number;
  qtd_contratos: number;
}

/**
 * Vitrine de corretoras pro produtor — todas as corretoras cadastradas
 * (não só as vinculadas), via view pública `corretoras_publicas` que
 * filtra colunas sensíveis (cnpj, endereço completo).
 */
export async function listCorretorasParaProdutor(
  produtorId: string,
): Promise<CorretoraVitrineItem[]> {
  const [corretorasRes, favoritosRes, leadsRes, contratosRes] =
    await Promise.all([
      supabase
        .from("corretoras_publicas")
        .select(
          "id, name, slug, city, state, phone, email, verified, regioes_atendimento",
        )
        .order("verified", { ascending: false })
        .order("name", { ascending: true })
        .limit(500),
      supabase
        .from("favoritos")
        .select("corretora_id")
        .eq("produtor_id", produtorId),
      supabase
        .from("leads")
        .select("corretora_id")
        .eq("produtor_id", produtorId),
      supabase
        .from("contratos")
        .select("corretora_id")
        .eq("produtor_id", produtorId),
    ]);

  const favoritas = new Set(
    ((favoritosRes.data ?? []) as { corretora_id: string }[]).map(
      (r) => r.corretora_id,
    ),
  );
  const leadsCount = new Map<string, number>();
  for (const r of (leadsRes.data ?? []) as { corretora_id: string }[]) {
    leadsCount.set(r.corretora_id, (leadsCount.get(r.corretora_id) ?? 0) + 1);
  }
  const contratosCount = new Map<string, number>();
  for (const r of (contratosRes.data ?? []) as { corretora_id: string }[]) {
    contratosCount.set(
      r.corretora_id,
      (contratosCount.get(r.corretora_id) ?? 0) + 1,
    );
  }

  type Row = {
    id: string | null;
    name: string | null;
    slug: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    email: string | null;
    verified: boolean | null;
    regioes_atendimento: string[] | null;
  };

  const rows = ((corretorasRes.data ?? []) as Row[])
    .filter((c): c is Row & { id: string; name: string; slug: string } =>
      !!c.id && !!c.name && !!c.slug,
    )
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      city: c.city,
      state: c.state,
      phone: c.phone,
      email: c.email,
      verified: c.verified ?? false,
      regioes_atendimento: c.regioes_atendimento ?? [],
      is_favorita: favoritas.has(c.id),
      qtd_negociacoes: leadsCount.get(c.id) ?? 0,
      qtd_contratos: contratosCount.get(c.id) ?? 0,
    }));

  return rows.sort((a, b) => {
    if (a.is_favorita !== b.is_favorita) return a.is_favorita ? -1 : 1;
    if (a.verified !== b.verified) return a.verified ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export async function toggleFavoritoCorretora(
  produtorId: string,
  corretoraId: string,
  action: "add" | "remove",
): Promise<{ error?: string }> {
  if (action === "add") {
    const { error } = await supabase
      .from("favoritos")
      .insert({ produtor_id: produtorId, corretora_id: corretoraId });
    if (error && !error.message.includes("duplicate")) {
      return { error: error.message };
    }
    return {};
  }
  const { error } = await supabase
    .from("favoritos")
    .delete()
    .eq("produtor_id", produtorId)
    .eq("corretora_id", corretoraId);
  if (error) return { error: error.message };
  return {};
}

// ----------------------------------------------------------------- //
// PROPOSTAS — produtor responde proposta da corretora (aceita/rejeita)
// ----------------------------------------------------------------- //
// Fase C do redesign do mobile. RLS adicionada em
// 20260531000000_propostas_produtor_responde.sql permite que o
// produtor (auth.uid()) leia propostas dos próprios leads e mude
// status de "enviada" pra "aceita"|"rejeitada".

type PropostaStatusProdutor =
  | "rascunho"
  | "enviada"
  | "aceita"
  | "rejeitada"
  | "expirada";

export interface PropostaParaProdutor {
  id: string;
  status: PropostaStatusProdutor;
  preco_saca: number;
  bag_count: number | null;
  mensagem: string | null;
  validade_ate: string | null;
  enviada_em: string | null;
  respondida_em: string | null;
  created_at: string;
  /** Lead que a proposta veio (sempre 1) */
  lead_id: string;
  /** Corretora que enviou */
  corretora_id: string;
  corretora_nome: string;
  corretora_phone: string | null;
  /** Café do lead (compatibilidade visual com cards de negociação) */
  coffee_type: string | null;
}

/**
 * Lista propostas dos leads do produtor logado. Por padrão traz só as
 * que precisam de resposta (status='enviada'), mas aceita filtro.
 *
 * Usa a RPC v1 `v1_listar_propostas_produtor` (contrato estável — ver
 * migration 20260654000000) em vez de PostgREST direto: desacopla o app
 * publicado do schema (joins por FK, colunas hardcoded).
 */
export async function listMinhasPropostas(
  produtorId: string,
  opts: { onlyPending?: boolean } = { onlyPending: true },
): Promise<PropostaParaProdutor[]> {
  const { data, error } = await supabase.rpc("v1_listar_propostas_produtor", {
    p_only_pending: opts.onlyPending ?? true,
  });

  if (error) {
    // ANTES: `console.warn` + `return []` engolia o erro de leitura e o produtor
    // via "Nenhuma proposta" — mascarava falha de RPC/RLS como lista vazia.
    // AGORA: loga como ERROR (não warn) e RELANÇA. Quem chama esta query é o
    // `useList` da tela negociacoes, que captura no try/catch e expõe via
    // `error` (renderizado como banner) — sem nunca mentir "vazio".
    logger.error("listar_propostas_falhou", { err: safeError(error) });
    throw error;
  }

  // produtorId mantido na assinatura por compat; a RPC já filtra por
  // auth.uid() server-side (não confiamos no client pra isolamento).
  void produtorId;

  // O @supabase/supabase-js do mobile (postgrest-js mais antigo que o web)
  // não infere o retorno tipado desta RPC, então tipamos a linha aqui.
  type V1PropostaRow = {
    id: string;
    status: PropostaStatusProdutor;
    preco_saca: number | string;
    bag_count: number | null;
    mensagem: string | null;
    validade_ate: string | null;
    enviada_em: string | null;
    respondida_em: string | null;
    created_at: string;
    lead_id: string;
    corretora_id: string;
    corretora_nome: string | null;
    corretora_phone: string | null;
    coffee_type: string | null;
  };

  return (data ?? []).map(
    (r: V1PropostaRow): PropostaParaProdutor => ({
      id: r.id,
      status: r.status,
      preco_saca: Number(r.preco_saca),
      bag_count: r.bag_count,
      mensagem: r.mensagem,
      validade_ate: r.validade_ate,
      enviada_em: r.enviada_em,
      respondida_em: r.respondida_em,
      created_at: r.created_at,
      lead_id: r.lead_id,
      corretora_id: r.corretora_id,
      corretora_nome: r.corretora_nome ?? "Corretora",
      corretora_phone: r.corretora_phone ?? null,
      coffee_type: r.coffee_type ?? null,
    }),
  );
}

/**
 * Produtor responde uma proposta enviada (aceita ou rejeita).
 *
 * Usa a RPC v1 `v1_responder_proposta` (contrato estável) que faz
 * compare-and-set server-side (só transiciona de 'enviada' e só em lead
 * do próprio produtor).
 */
export async function responderProposta(
  propostaId: string,
  resposta: "aceita" | "rejeitada",
): Promise<{ error?: string }> {
  const { data, error } = await supabase.rpc("v1_responder_proposta", {
    p_proposta_id: propostaId,
    p_resposta: resposta,
  });

  if (error) return { error: error.message };
  const row = data?.[0];
  if (!row?.success) {
    return {
      error:
        row?.error_msg === "proposta_indisponivel"
          ? "Proposta já respondida ou indisponível."
          : (row?.error_msg ?? "Falha ao responder proposta."),
    };
  }
  return {};
}

// ----------------------------------------------------------------- //
// OFERTAS — produtor manifesta interesse de vender pra uma corretora
// ----------------------------------------------------------------- //
// Cria um lead na corretora (status=novo, origem=vitrine), e ela vê
// aparecer na Central de Leads dela. Sem lote ainda — só o sinal:
// "tenho X sacas de café Y na fazenda Z, querem comprar?". Quando a
// corretora aceitar, ela classifica e vira lote real.
//
// Reusa o schema `leads` (Fase 4 do redesign) com origem `vitrine`
// (Fase 9d). RLS de leads já cobre — qualquer authenticated insere
// se for o próprio produtor_id e a corretora_id existir.

export type OfertaInput = {
  corretoraId: string;
  produtorId: string;
  /** "arabica" | "conillon" — mapeado pra leads.coffee_type texto livre */
  specie: "arabica" | "conillon";
  /** opcional — natural / cd_desmucilado / despolpado / fermentacao_induzida */
  processo?: CoffeeProcesso | null;
  /** quantidade de sacas de 60kg disponíveis */
  bagCount: number;
  /** R$/sc esperado (opcional — quando vazio, fica em aberto) */
  precoAlvo?: number | null;
  /** descrição livre do produtor (safra, fazenda, características) */
  observacoes?: string | null;
};

/**
 * Produtor cria uma oferta pra uma corretora.
 *
 * Usa a RPC v1 `v1_criar_oferta_produtor` (contrato estável) que monta o
 * coffee_type humano server-side e checa auth.uid()/corretora. Desacopla
 * o app do schema da tabela `leads` (enums origem/status, nome de coluna).
 */
export async function criarOfertaProdutor(
  input: OfertaInput,
): Promise<{ leadId?: string; error?: string }> {
  // produtorId mantido na assinatura por compat; a RPC usa auth.uid().
  void input.produtorId;

  const { data, error } = await supabase.rpc("v1_criar_oferta_produtor", {
    p_corretora_id: input.corretoraId,
    p_specie: input.specie,
    p_processo: input.processo ?? undefined,
    p_bag_count: input.bagCount,
    p_preco_alvo: input.precoAlvo ?? undefined,
    p_observacoes: input.observacoes ?? undefined,
  });

  if (error) return { error: error.message };
  const row = data?.[0];
  if (!row?.success || !row.lead_id) {
    return { error: row?.error_msg ?? "Falha ao criar oferta" };
  }
  return { leadId: row.lead_id };
}

/**
 * Lista corretoras pra picker da tela de oferta — versão mínima da
 * `listCorretorasParaProdutor` sem dados extras (sem favorito/contagem).
 * Ordena favoritas primeiro pra reduzir scroll.
 */
export type CorretoraPicker = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  verified: boolean;
  favorita: boolean;
};

export async function listCorretorasParaOferta(
  produtorId: string,
): Promise<CorretoraPicker[]> {
  const [corretorasRes, favoritosRes] = await Promise.all([
    supabase
      .from("corretoras_publicas")
      .select("id, name, city, state, verified")
      .order("verified", { ascending: false })
      .order("name", { ascending: true })
      .limit(500),
    supabase
      .from("favoritos")
      .select("corretora_id")
      .eq("produtor_id", produtorId),
  ]);

  const favoritosSet = new Set(
    ((favoritosRes.data ?? []) as { corretora_id: string }[]).map(
      (f) => f.corretora_id,
    ),
  );

  type Row = {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    verified: boolean;
  };
  const rows = (corretorasRes.data ?? []) as Row[];

  const items: CorretoraPicker[] = rows.map((r) => ({
    ...r,
    favorita: favoritosSet.has(r.id),
  }));

  // Favoritas primeiro
  items.sort((a, b) => {
    if (a.favorita !== b.favorita) return a.favorita ? -1 : 1;
    if (a.verified !== b.verified) return a.verified ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return items;
}
