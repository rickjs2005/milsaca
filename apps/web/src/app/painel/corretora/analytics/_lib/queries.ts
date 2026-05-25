// Queries de analytics da corretora.
// Estratégia: pegar registros do período (12-24 meses no máximo) e agregar
// em memória. PostgREST do Supabase não expõe agregações SQL diretas;
// pra volumes baixos (centenas de leads/contratos) isso é OK e mais simples
// que criar RPC functions por gráfico.

import { createClient } from "@milsaca/db/web/server";
import type { LeadStatus, ContratoStatus } from "@milsaca/types";

const MONTHS_LEADS = 6;
const MONTHS_COMISSAO = 12;

export type AnalyticsKpis = {
  ticketMedio: number;
  conversaoPct: number;
  totalContratosAtivos: number;
  comissaoAcumuladaAno: number;
};

export type SerieMensal = {
  mes: string; // "Jan", "Fev"...
  mesIso: string; // "2026-01"
  valor: number;
};

export type FunilItem = {
  status: LeadStatus;
  label: string;
  count: number;
};

export type MixItem = {
  specie: string;
  label: string;
  sacas: number;
};

export type TopComprador = {
  id: string;
  name: string;
  contratos: number;
  total: number;
  comissao: number;
};

const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  em_negociacao: "Em negociação",
  convertido: "Convertido",
  perdido: "Perdido",
  arquivado: "Arquivado",
};

const SPECIE_LABEL: Record<string, string> = {
  arabica: "Arábica",
  conillon: "Conillón",
  conilon: "Conillón",
};

const MES_CURTO = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function monthIsoFromDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildEmptyMonthSeries(months: number): SerieMensal[] {
  const out: SerieMensal[] = [];
  const today = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1),
    );
    out.push({
      mes: MES_CURTO[d.getUTCMonth()] ?? "",
      mesIso: monthIsoFromDate(d),
      valor: 0,
    });
  }
  return out;
}

export async function loadAnalyticsKpis(
  corretoraId: string,
): Promise<AnalyticsKpis> {
  const supabase = await createClient();
  const yearStart = new Date();
  yearStart.setUTCMonth(0, 1);
  yearStart.setUTCHours(0, 0, 0, 0);

  const [leadsAll, contratos] = await Promise.all([
    supabase
      .from("leads")
      .select("status", { count: "exact" })
      .eq("corretora_id", corretoraId),
    supabase
      .from("contratos")
      .select("status, total_value, comissao_total, signed_at")
      .eq("corretora_id", corretoraId),
  ]);

  const leadsRows = (leadsAll.data ?? []) as { status: LeadStatus }[];
  const total = leadsRows.length;
  const convertidos = leadsRows.filter((l) => l.status === "convertido").length;
  const conversaoPct = total > 0 ? (convertidos / total) * 100 : 0;

  const contratosRows = (contratos.data ?? []) as {
    status: ContratoStatus;
    total_value: number | string | null;
    comissao_total: number | string | null;
    signed_at: string | null;
  }[];

  const ativosOuFinalizados = contratosRows.filter(
    (c) => c.status === "ativo" || c.status === "finalizado",
  );
  const totalContratosAtivos = contratosRows.filter(
    (c) => c.status === "ativo",
  ).length;

  const somaValores = ativosOuFinalizados.reduce(
    (sum, c) => sum + (c.total_value != null ? Number(c.total_value) : 0),
    0,
  );
  const ticketMedio =
    ativosOuFinalizados.length > 0
      ? somaValores / ativosOuFinalizados.length
      : 0;

  const comissaoAcumuladaAno = contratosRows
    .filter(
      (c) =>
        (c.status === "ativo" || c.status === "finalizado") &&
        c.signed_at &&
        new Date(c.signed_at) >= yearStart,
    )
    .reduce(
      (sum, c) =>
        sum + (c.comissao_total != null ? Number(c.comissao_total) : 0),
      0,
    );

  return {
    ticketMedio,
    conversaoPct,
    totalContratosAtivos,
    comissaoAcumuladaAno,
  };
}

export async function loadLeadsPorMes(
  corretoraId: string,
): Promise<SerieMensal[]> {
  const supabase = await createClient();
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - MONTHS_LEADS + 1, 1);
  since.setUTCHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("leads")
    .select("created_at")
    .eq("corretora_id", corretoraId)
    .gte("created_at", since.toISOString());

  const rows = (data ?? []) as { created_at: string }[];
  const series = buildEmptyMonthSeries(MONTHS_LEADS);
  const indexByIso = new Map(series.map((s, i) => [s.mesIso, i]));

  for (const r of rows) {
    const iso = monthIsoFromDate(new Date(r.created_at));
    const idx = indexByIso.get(iso);
    if (idx != null) {
      const item = series[idx];
      if (item) item.valor++;
    }
  }
  return series;
}

export async function loadFunilLeads(
  corretoraId: string,
): Promise<FunilItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("status")
    .eq("corretora_id", corretoraId);

  const rows = (data ?? []) as { status: LeadStatus }[];
  const order: LeadStatus[] = [
    "novo",
    "em_negociacao",
    "convertido",
    "perdido",
    "arquivado",
  ];
  return order.map((s) => ({
    status: s,
    label: STATUS_LABEL[s],
    count: rows.filter((r) => r.status === s).length,
  }));
}

export async function loadComissaoAcumulada(
  corretoraId: string,
): Promise<SerieMensal[]> {
  const supabase = await createClient();
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - MONTHS_COMISSAO + 1, 1);
  since.setUTCHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("contratos")
    .select("comissao_total, signed_at, status")
    .eq("corretora_id", corretoraId)
    .in("status", ["ativo", "finalizado"])
    .gte("signed_at", since.toISOString());

  const rows = (data ?? []) as {
    comissao_total: number | string | null;
    signed_at: string | null;
  }[];

  const series = buildEmptyMonthSeries(MONTHS_COMISSAO);
  const indexByIso = new Map(series.map((s, i) => [s.mesIso, i]));

  for (const r of rows) {
    if (!r.signed_at || r.comissao_total == null) continue;
    const iso = monthIsoFromDate(new Date(r.signed_at));
    const idx = indexByIso.get(iso);
    if (idx != null) {
      const item = series[idx];
      if (item) item.valor += Number(r.comissao_total);
    }
  }
  return series;
}

export async function loadMixCafe(corretoraId: string): Promise<MixItem[]> {
  const supabase = await createClient();
  // contratos têm coffee_type texto livre; preferir lotes pelo enum specie
  // pois é mais limpo. Fallback: agrupar pelo prefixo do coffee_type.
  const { data } = await supabase
    .from("contratos")
    .select("coffee_type, bag_count, status")
    .eq("corretora_id", corretoraId)
    .in("status", ["ativo", "finalizado"]);

  const rows = (data ?? []) as {
    coffee_type: string | null;
    bag_count: number | null;
  }[];

  const acc: Record<string, number> = { arabica: 0, conillon: 0 };
  for (const r of rows) {
    const t = (r.coffee_type ?? "").toLowerCase();
    const sacas = r.bag_count ?? 0;
    if (t.includes("arab")) acc.arabica = (acc.arabica ?? 0) + sacas;
    else if (t.includes("coni")) acc.conillon = (acc.conillon ?? 0) + sacas;
  }

  return [
    { specie: "arabica", label: SPECIE_LABEL.arabica ?? "Arábica", sacas: acc.arabica ?? 0 },
    {
      specie: "conillon",
      label: SPECIE_LABEL.conillon ?? "Conillón",
      sacas: acc.conillon ?? 0,
    },
  ].filter((m) => m.sacas > 0);
}

/**
 * Métricas extras pedidas no briefing comercial.
 *  - leadsNovosMes / convertidosMes: contagens do mês corrente
 *  - sacasEmNegociacao: soma de bag_count nos leads em_negociacao
 *  - sacasVendidasMes: soma de bag_count nos contratos com signed_at no mês
 *  - produtoresAtivos: distinct produtor_id em (leads + lotes + contratos)
 *  - compradoresAtivos: compradores com flag ativo=true
 */
export type AnalyticsExtras = {
  leadsNovosMes: number;
  convertidosMes: number;
  sacasEmNegociacao: number;
  sacasVendidasMes: number;
  produtoresAtivos: number;
  compradoresAtivos: number;
};

export async function loadAnalyticsExtras(
  corretoraId: string,
): Promise<AnalyticsExtras> {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthIso = monthStart.toISOString();

  const [
    novosMes,
    convertidosMes,
    leadsEmNeg,
    contratosMes,
    leadProdutorIds,
    loteProdutorIds,
    contratoProdutorIds,
    compradoresAtivos,
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .gte("created_at", monthIso),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("status", "convertido")
      .gte("updated_at", monthIso),
    supabase
      .from("leads")
      .select("bag_count")
      .eq("corretora_id", corretoraId)
      .eq("status", "em_negociacao"),
    supabase
      .from("contratos")
      .select("bag_count, signed_at")
      .eq("corretora_id", corretoraId)
      .in("status", ["ativo", "finalizado"])
      .gte("signed_at", monthIso),
    supabase
      .from("leads")
      .select("produtor_id")
      .eq("corretora_id", corretoraId)
      .not("produtor_id", "is", null),
    supabase
      .from("lotes")
      .select("produtor_id")
      .eq("corretora_id", corretoraId)
      .not("produtor_id", "is", null),
    supabase
      .from("contratos")
      .select("produtor_id")
      .eq("corretora_id", corretoraId)
      .not("produtor_id", "is", null),
    supabase
      .from("compradores")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("ativo", true),
  ]);

  const sacasEmNeg = (
    (leadsEmNeg.data ?? []) as { bag_count: number | null }[]
  ).reduce((sum, r) => sum + (r.bag_count ?? 0), 0);

  const sacasVendidasMes = (
    (contratosMes.data ?? []) as {
      bag_count: number | null;
      signed_at: string | null;
    }[]
  ).reduce((sum, r) => sum + (r.bag_count ?? 0), 0);

  const produtoresUnicos = new Set<string>();
  for (const row of [
    ...(leadProdutorIds.data ?? []),
    ...(loteProdutorIds.data ?? []),
    ...(contratoProdutorIds.data ?? []),
  ] as { produtor_id: string | null }[]) {
    if (row.produtor_id) produtoresUnicos.add(row.produtor_id);
  }

  return {
    leadsNovosMes: novosMes.count ?? 0,
    convertidosMes: convertidosMes.count ?? 0,
    sacasEmNegociacao: sacasEmNeg,
    sacasVendidasMes,
    produtoresAtivos: produtoresUnicos.size,
    compradoresAtivos: compradoresAtivos.count ?? 0,
  };
}

/**
 * Distribuição de leads por canal de origem (whatsapp / formulario /
 * vitrine / manual). Lê direto de `leads.origem` (enum criado na Fase 9d).
 * Leads legados sem origem entram em "Não informada".
 *
 * Retorna `null` se a corretora não tem leads ainda.
 */
export type OrigemLeads = {
  whatsapp: number;
  formulario: number;
  vitrine: number;
  manual: number;
  semOrigem: number;
  total: number;
};

export async function loadOrigemLeads(
  corretoraId: string,
): Promise<OrigemLeads | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("origem")
    .eq("corretora_id", corretoraId);

  const rows = (data ?? []) as { origem: string | null }[];
  if (rows.length === 0) return null;

  const acc = {
    whatsapp: 0,
    formulario: 0,
    vitrine: 0,
    manual: 0,
    semOrigem: 0,
  };
  for (const r of rows) {
    if (r.origem === "whatsapp") acc.whatsapp++;
    else if (r.origem === "formulario") acc.formulario++;
    else if (r.origem === "vitrine") acc.vitrine++;
    else if (r.origem === "manual") acc.manual++;
    else acc.semOrigem++;
  }
  return { ...acc, total: rows.length };
}

export async function loadTopCompradores(
  corretoraId: string,
  limit = 5,
): Promise<TopComprador[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contratos")
    .select(
      "comprador_id, total_value, comissao_total, status, comprador:compradores!contratos_comprador_id_fkey(id, name)",
    )
    .eq("corretora_id", corretoraId)
    .in("status", ["ativo", "finalizado"])
    .not("comprador_id", "is", null);

  const rows = (data ?? []) as Array<{
    comprador_id: string;
    total_value: number | string | null;
    comissao_total: number | string | null;
    comprador:
      | { id: string; name: string }
      | { id: string; name: string }[]
      | null;
  }>;

  const map = new Map<string, TopComprador>();
  for (const r of rows) {
    const c = Array.isArray(r.comprador) ? r.comprador[0] : r.comprador;
    if (!c) continue;
    const existing = map.get(c.id) ?? {
      id: c.id,
      name: c.name,
      contratos: 0,
      total: 0,
      comissao: 0,
    };
    existing.contratos++;
    existing.total += r.total_value != null ? Number(r.total_value) : 0;
    existing.comissao +=
      r.comissao_total != null ? Number(r.comissao_total) : 0;
    map.set(c.id, existing);
  }
  return Array.from(map.values())
    .sort((a, b) => b.comissao - a.comissao)
    .slice(0, limit);
}
