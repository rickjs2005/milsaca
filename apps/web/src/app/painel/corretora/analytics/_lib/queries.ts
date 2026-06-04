// Queries de analytics da corretora.
// Estratégia: buscar os registros da corretora (leads + contratos, volumes
// baixos no piloto) e agregar TUDO em memória num único loader. Isso mantém a
// consistência num lugar só e deixa o período (janela) recalcular cada métrica
// sem espalhar a lógica de data por várias funções.

import { createClient } from "@milsaca/db/web/server";
import type { LeadStatus, ContratoStatus } from "@milsaca/types";
import {
  computeDelta,
  resolveRange,
  type DeltaInfo,
  type Period,
} from "./period";

const MONTHS_LEADS = 6;
const MONTHS_COMISSAO = 12;

type SerieMensal = {
  mes: string; // "Jan", "Fev"...
  mesIso: string; // "2026-01"
  valor: number;
};

type FunilItem = {
  status: LeadStatus;
  label: string;
  count: number;
};

type MixItem = {
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

type OrigemLeads = {
  whatsapp: number;
  formulario: number;
  vitrine: number;
  manual: number;
  semOrigem: number;
  total: number;
};

type Metric = { value: number; delta: DeltaInfo };

export type AnalyticsData = {
  periodLabel: string;
  prevLabel: string;
  /** Primeiro mês com dado (pra avisar "dados a partir de X"). */
  primeiroMesComDado: string | null;
  flow: {
    leadsNovos: Metric;
    convertidos: Metric;
    conversaoPct: Metric;
    comissao: Metric;
    sacasVendidas: Metric;
  };
  snapshot: {
    sacasEmNegociacao: number;
    produtoresAtivos: number;
    compradoresAtivos: number;
    contratosAtivos: number;
    ticketMedio: number;
  };
  funil: FunilItem[];
  origem: OrigemLeads | null;
  mix: MixItem[];
  topCompradores: TopComprador[];
  trendLeads: SerieMensal[];
  trendComissao: SerieMensal[];
  isEmpty: boolean;
};

const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  em_negociacao: "Em negociação",
  convertido: "Convertido",
  perdido: "Perdido",
  arquivado: "Arquivado",
};

const FUNIL_ORDER: LeadStatus[] = [
  "novo",
  "em_negociacao",
  "convertido",
  "perdido",
  "arquivado",
];

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

function buildEmptyMonthSeries(months: number, nowMs: number): SerieMensal[] {
  const out: SerieMensal[] = [];
  const today = new Date(nowMs);
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

function inWindow(iso: string | null, start: Date, end: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

// ---------------------------------------------------------------------------
// Tipos crus (linhas lidas do banco)
// ---------------------------------------------------------------------------

type LeadRow = {
  status: LeadStatus;
  created_at: string;
  updated_at: string | null;
  bag_count: number | null;
  origem: string | null;
  produtor_id: string | null;
};

type ContratoRow = {
  status: ContratoStatus;
  total_value: number | string | null;
  comissao_total: number | string | null;
  bag_count: number | null;
  coffee_type: string | null;
  signed_at: string | null;
  produtor_id: string | null;
  comprador_id: string | null;
  comprador: { id: string; name: string } | { id: string; name: string }[] | null;
};

function num(v: number | string | null | undefined): number {
  return v != null ? Number(v) : 0;
}

// ---------------------------------------------------------------------------
// Métricas de fluxo de uma janela [start, end)
// ---------------------------------------------------------------------------

type FlowRaw = {
  leadsNovos: number;
  convertidos: number;
  conversaoPct: number;
  comissao: number;
  sacasVendidas: number;
};

function flowFor(
  leads: LeadRow[],
  contratos: ContratoRow[],
  start: Date,
  end: Date,
): FlowRaw {
  let leadsNovos = 0;
  let convertidos = 0;
  for (const l of leads) {
    if (inWindow(l.created_at, start, end)) leadsNovos += 1;
    if (l.status === "convertido" && inWindow(l.updated_at, start, end)) {
      convertidos += 1;
    }
  }
  let comissao = 0;
  let sacasVendidas = 0;
  for (const c of contratos) {
    if (c.status !== "ativo" && c.status !== "finalizado") continue;
    if (!inWindow(c.signed_at, start, end)) continue;
    comissao += num(c.comissao_total);
    sacasVendidas += num(c.bag_count);
  }
  return {
    leadsNovos,
    convertidos,
    conversaoPct: leadsNovos > 0 ? (convertidos / leadsNovos) * 100 : 0,
    comissao,
    sacasVendidas,
  };
}

// ---------------------------------------------------------------------------
// Loader único
// ---------------------------------------------------------------------------

export async function loadAnalytics(
  corretoraId: string,
  period: Period,
  nowMs: number,
): Promise<AnalyticsData> {
  const supabase = await createClient();
  const range = resolveRange(period, nowMs);

  const [leadsRes, contratosRes, lotesRes, compradoresRes] = await Promise.all([
    supabase
      .from("leads")
      .select("status, created_at, updated_at, bag_count, origem, produtor_id")
      .eq("corretora_id", corretoraId),
    supabase
      .from("contratos")
      .select(
        "status, total_value, comissao_total, bag_count, coffee_type, signed_at, produtor_id, comprador_id, comprador:compradores!contratos_comprador_id_fkey(id, name)",
      )
      .eq("corretora_id", corretoraId),
    supabase
      .from("lotes")
      .select("produtor_id")
      .eq("corretora_id", corretoraId)
      .not("produtor_id", "is", null),
    supabase
      .from("compradores")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("ativo", true),
  ]);

  const leads = (leadsRes.data ?? []) as LeadRow[];
  const contratos = (contratosRes.data ?? []) as ContratoRow[];

  // --- Fluxo (atual vs anterior) → deltas
  const curr = flowFor(leads, contratos, range.start, range.end);
  const prev = flowFor(leads, contratos, range.prevStart, range.prevEnd);

  const flow = {
    leadsNovos: {
      value: curr.leadsNovos,
      delta: computeDelta(curr.leadsNovos, prev.leadsNovos, range.prevLabel),
    },
    convertidos: {
      value: curr.convertidos,
      delta: computeDelta(curr.convertidos, prev.convertidos, range.prevLabel),
    },
    conversaoPct: {
      value: curr.conversaoPct,
      delta: computeDelta(curr.conversaoPct, prev.conversaoPct, range.prevLabel),
    },
    comissao: {
      value: curr.comissao,
      delta: computeDelta(curr.comissao, prev.comissao, range.prevLabel),
    },
    sacasVendidas: {
      value: curr.sacasVendidas,
      delta: computeDelta(curr.sacasVendidas, prev.sacasVendidas, range.prevLabel),
    },
  };

  // --- Snapshot (estado atual; não usa período)
  const sacasEmNegociacao = leads
    .filter((l) => l.status === "em_negociacao")
    .reduce((s, l) => s + num(l.bag_count), 0);

  const produtoresUnicos = new Set<string>();
  for (const l of leads) if (l.produtor_id) produtoresUnicos.add(l.produtor_id);
  for (const c of contratos)
    if (c.produtor_id) produtoresUnicos.add(c.produtor_id);
  for (const r of (lotesRes.data ?? []) as { produtor_id: string | null }[]) {
    if (r.produtor_id) produtoresUnicos.add(r.produtor_id);
  }

  const ativosOuFinal = contratos.filter(
    (c) => c.status === "ativo" || c.status === "finalizado",
  );
  const ticketMedio =
    ativosOuFinal.length > 0
      ? ativosOuFinal.reduce((s, c) => s + num(c.total_value), 0) /
        ativosOuFinal.length
      : 0;

  const snapshot = {
    sacasEmNegociacao,
    produtoresAtivos: produtoresUnicos.size,
    compradoresAtivos: compradoresRes.count ?? 0,
    contratosAtivos: contratos.filter((c) => c.status === "ativo").length,
    ticketMedio,
  };

  // --- Funil (escopado ao período: leads criados na janela)
  const leadsNaJanela = leads.filter((l) =>
    inWindow(l.created_at, range.start, range.end),
  );
  const funil: FunilItem[] = FUNIL_ORDER.map((s) => ({
    status: s,
    label: STATUS_LABEL[s],
    count: leadsNaJanela.filter((l) => l.status === s).length,
  }));

  // --- Origem (escopada ao período)
  let origem: OrigemLeads | null = null;
  if (leadsNaJanela.length > 0) {
    const acc = { whatsapp: 0, formulario: 0, vitrine: 0, manual: 0, semOrigem: 0 };
    for (const l of leadsNaJanela) {
      if (l.origem === "whatsapp") acc.whatsapp++;
      else if (l.origem === "formulario") acc.formulario++;
      else if (l.origem === "vitrine") acc.vitrine++;
      else if (l.origem === "manual") acc.manual++;
      else acc.semOrigem++;
    }
    origem = { ...acc, total: leadsNaJanela.length };
  }

  // --- Contratos fechados na janela (mix + top compradores)
  const contratosJanela = contratos.filter(
    (c) =>
      (c.status === "ativo" || c.status === "finalizado") &&
      inWindow(c.signed_at, range.start, range.end),
  );

  const mixAcc: Record<string, number> = { arabica: 0, conillon: 0 };
  for (const c of contratosJanela) {
    const t = (c.coffee_type ?? "").toLowerCase();
    const sacas = num(c.bag_count);
    if (t.includes("arab")) mixAcc.arabica = (mixAcc.arabica ?? 0) + sacas;
    else if (t.includes("coni")) mixAcc.conillon = (mixAcc.conillon ?? 0) + sacas;
  }
  const mix: MixItem[] = [
    { specie: "arabica", label: SPECIE_LABEL.arabica ?? "Arábica", sacas: mixAcc.arabica ?? 0 },
    { specie: "conillon", label: SPECIE_LABEL.conillon ?? "Conillón", sacas: mixAcc.conillon ?? 0 },
  ].filter((m) => m.sacas > 0);

  const topMap = new Map<string, TopComprador>();
  for (const c of contratosJanela) {
    const cp = Array.isArray(c.comprador) ? c.comprador[0] : c.comprador;
    if (!cp) continue;
    const ex =
      topMap.get(cp.id) ??
      { id: cp.id, name: cp.name, contratos: 0, total: 0, comissao: 0 };
    ex.contratos += 1;
    ex.total += num(c.total_value);
    ex.comissao += num(c.comissao_total);
    topMap.set(cp.id, ex);
  }
  const topCompradores = Array.from(topMap.values())
    .sort((a, b) => b.comissao - a.comissao)
    .slice(0, 5);

  // --- Tendências (janelas trailing fixas, NÃO usam o período)
  const trendLeads = buildEmptyMonthSeries(MONTHS_LEADS, nowMs);
  const idxLeads = new Map(trendLeads.map((s, i) => [s.mesIso, i]));
  for (const l of leads) {
    const idx = idxLeads.get(monthIsoFromDate(new Date(l.created_at)));
    if (idx != null) {
      const item = trendLeads[idx];
      if (item) item.valor += 1;
    }
  }

  // Comissão: mensal → acumulada (running sum). Só sobe ou fica plana.
  const trendComissao = buildEmptyMonthSeries(MONTHS_COMISSAO, nowMs);
  const idxCom = new Map(trendComissao.map((s, i) => [s.mesIso, i]));
  for (const c of contratos) {
    if (c.status !== "ativo" && c.status !== "finalizado") continue;
    if (!c.signed_at) continue;
    const idx = idxCom.get(monthIsoFromDate(new Date(c.signed_at)));
    if (idx != null) {
      const item = trendComissao[idx];
      if (item) item.valor += num(c.comissao_total);
    }
  }
  let acc = 0;
  for (const s of trendComissao) {
    acc += s.valor;
    s.valor = acc;
  }

  // Primeiro mês com dado real na tendência (pra nota "dados a partir de X").
  const primeiroMesComDado = trendLeads.find((s) => s.valor > 0)?.mes ?? null;

  const isEmpty =
    leads.length === 0 &&
    contratos.length === 0 &&
    snapshot.compradoresAtivos === 0;

  return {
    periodLabel: range.label,
    prevLabel: range.prevLabel,
    primeiroMesComDado,
    flow,
    snapshot,
    funil,
    origem,
    mix,
    topCompradores,
    trendLeads,
    trendComissao,
    isEmpty,
  };
}
