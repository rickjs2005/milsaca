/**
 * Queries do dashboard inicial da corretora.
 * Centralizadas aqui pra manter o page.tsx focado em JSX + composição.
 *
 * Todas as queries:
 *  - filtram por corretora_id explicitamente (defesa em profundidade
 *    sobre o RLS existente);
 *  - retornam zeros em vez de explodir quando corretoraId vier vazio;
 *  - rodam em Promise.all no chamador pra economizar RTT.
 */

import { createClient } from "@milsaca/db/web/server";
import type { LeadStatus } from "@milsaca/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DashboardKpis = {
  leadsNovos: number;
  emNegociacao: number;
  valorEmNegociacao: number;
  convertidosMes: number;
  contratosAtivos: number;
  receitaMes: number;
  lotesAtivos: number;
  sacasDisponiveis: number;
  produtoresCadastrados: number;
  compradoresAtivos: number;
};

export async function loadDashboardKpis(
  corretoraId: string,
): Promise<DashboardKpis> {
  if (!corretoraId) {
    return {
      leadsNovos: 0,
      emNegociacao: 0,
      valorEmNegociacao: 0,
      convertidosMes: 0,
      contratosAtivos: 0,
      receitaMes: 0,
      lotesAtivos: 0,
      sacasDisponiveis: 0,
      produtoresCadastrados: 0,
      compradoresAtivos: 0,
    };
  }

  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();

  // Lotes "ativos" = tudo que não é rascunho/vendido/arquivado.
  // Briefing pediu "Lotes ativos" e "Sacas disponíveis" — usamos um único
  // SELECT que devolve peso_sacas pra contar e somar de uma vez.
  const LOTES_ATIVOS = [
    "aguardando_classificacao",
    "classificado",
    "fora_de_tipo",
    "rebeneficiar",
  ] as const;

  const [
    novos,
    emNeg,
    emNegValores,
    convMes,
    contratosAtivos,
    contratosMes,
    lotesAtivos,
    produtores,
    compradores,
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("status", "novo"),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("status", "em_negociacao"),
    supabase
      .from("leads")
      .select("proposed_price, bag_count")
      .eq("corretora_id", corretoraId)
      .eq("status", "em_negociacao"),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("status", "convertido")
      .gte("updated_at", monthStartIso),
    supabase
      .from("contratos")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("status", "ativo"),
    supabase
      .from("contratos")
      .select("comissao_total")
      .eq("corretora_id", corretoraId)
      .in("status", ["ativo", "finalizado"])
      .gte("updated_at", monthStartIso),
    supabase
      .from("lotes")
      .select("peso_sacas")
      .eq("corretora_id", corretoraId)
      .in("status", LOTES_ATIVOS as unknown as string[]),
    supabase
      .from("produtor_contatos")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId),
    supabase
      .from("compradores")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("ativo", true),
  ]);

  const receitaMes = (
    (contratosMes.data ?? []) as { comissao_total: number | string | null }[]
  ).reduce(
    (sum, r) => sum + (r.comissao_total != null ? Number(r.comissao_total) : 0),
    0,
  );

  const lotesRows = (lotesAtivos.data ?? []) as Array<{
    peso_sacas: number | string | null;
  }>;
  const sacasDisponiveis = lotesRows.reduce(
    (sum, r) => sum + (r.peso_sacas != null ? Number(r.peso_sacas) : 0),
    0,
  );

  const valorEmNegociacao = (
    (emNegValores.data ?? []) as Array<{
      proposed_price: number | string | null;
      bag_count: number | null;
    }>
  ).reduce(
    (sum, r) =>
      sum +
      (r.proposed_price != null && r.bag_count != null
        ? Number(r.proposed_price) * r.bag_count
        : 0),
    0,
  );

  return {
    leadsNovos: novos.count ?? 0,
    emNegociacao: emNeg.count ?? 0,
    valorEmNegociacao,
    convertidosMes: convMes.count ?? 0,
    contratosAtivos: contratosAtivos.count ?? 0,
    receitaMes,
    lotesAtivos: lotesRows.length,
    sacasDisponiveis,
    produtoresCadastrados: produtores.count ?? 0,
    compradoresAtivos: compradores.count ?? 0,
  };
}

export type PipelineFunnel = {
  leads: number;
  lotes: number;
  ofertas: number;
  contratos: number;
  entregas: number;
  pagamentos: number;
};

/**
 * Contagem por etapa do ciclo da corretagem, pro funil do dashboard.
 * leads/lotes/contratos têm corretora_id (filtro explícito); ofertas/entregas/
 * pagamentos são isolados pelo RLS (escopo via lote/contrato), então a contagem
 * já vem só da corretora do usuário autenticado.
 */
export async function loadPipelineFunnel(
  corretoraId: string,
): Promise<PipelineFunnel> {
  const empty = {
    leads: 0,
    lotes: 0,
    ofertas: 0,
    contratos: 0,
    entregas: 0,
    pagamentos: 0,
  };
  if (!corretoraId) return empty;
  const supabase = await createClient();
  const headCount = (q: { count: number | null }) => q.count ?? 0;
  const scoped = (table: "leads" | "lotes" | "contratos") =>
    supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId);
  const viaRls = (
    table: "ofertas_comprador" | "entregas" | "produtor_pagamentos",
  ) => supabase.from(table).select("*", { count: "exact", head: true });

  const [leads, lotes, ofertas, contratos, entregas, pagamentos] =
    await Promise.all([
      scoped("leads"),
      scoped("lotes"),
      viaRls("ofertas_comprador"),
      scoped("contratos"),
      viaRls("entregas"),
      viaRls("produtor_pagamentos"),
    ]);

  return {
    leads: headCount(leads),
    lotes: headCount(lotes),
    ofertas: headCount(ofertas),
    contratos: headCount(contratos),
    entregas: headCount(entregas),
    pagamentos: headCount(pagamentos),
  };
}

export type DashboardLead = {
  id: string;
  produtor: string;
  bag_count: number | null;
  coffee_type: string | null;
  status: LeadStatus;
  data: string;
  valor: number | null;
  updatedAt: string;
};

export async function loadLeadsRecentes(
  corretoraId: string,
): Promise<DashboardLead[]> {
  if (!corretoraId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select(
      "id, status, coffee_type, bag_count, proposed_price, created_at, updated_at, produtor:profiles!leads_produtor_id_fkey(full_name)",
    )
    .eq("corretora_id", corretoraId)
    .order("created_at", { ascending: false })
    .limit(5);

  const rows = (data ?? []) as Array<{
    id: string;
    status: LeadStatus;
    coffee_type: string | null;
    bag_count: number | null;
    proposed_price: number | string | null;
    created_at: string;
    updated_at: string;
    produtor:
      | { full_name: string | null }
      | { full_name: string | null }[]
      | null;
  }>;

  return rows.map((r) => {
    const produtor = Array.isArray(r.produtor)
      ? r.produtor[0]?.full_name
      : r.produtor?.full_name;
    const valor =
      r.proposed_price != null && r.bag_count != null
        ? Number(r.proposed_price) * r.bag_count
        : null;
    return {
      id: r.id,
      produtor: produtor ?? "Produtor sem nome",
      bag_count: r.bag_count,
      coffee_type: r.coffee_type,
      status: r.status,
      valor,
      updatedAt: r.updated_at,
      data: new Date(r.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
    };
  });
}

export type CotacaoDashboard = {
  coffee_type: string;
  price: number;
  variacao: number | null;
  source: string | null;
};

export async function loadCotacoesDashboard(
  corretoraId: string,
): Promise<CotacaoDashboard[]> {
  if (!corretoraId) return [];
  const supabase = await createClient();
  const types = ["arabica", "conillon"] as const;

  const queries = await Promise.all(
    types.map((t) =>
      supabase
        .from("cotacoes")
        // Filtra pela espécie canônica (`specie`); `coffee_type` é só o label
        // de exibição ("Arábica"/"Conillón"), não casava com o slug "arabica".
        .select("coffee_type, price, source, reference_date")
        .eq("corretora_id", corretoraId)
        .eq("specie", t)
        .order("reference_date", { ascending: false })
        .limit(2),
    ),
  );

  const result: CotacaoDashboard[] = [];
  for (const { data } of queries) {
    const rows = (data ?? []) as Array<{
      coffee_type: string;
      price: number;
      source: string | null;
      reference_date: string;
    }>;
    const [current, previous] = rows;
    if (!current) continue;
    const variacao = previous
      ? ((current.price - previous.price) / previous.price) * 100
      : null;
    result.push({
      coffee_type: current.coffee_type,
      price: current.price,
      variacao,
      source: current.source,
    });
  }
  return result;
}

/**
 * Counts pra badges da sidebar — pequenos, urgentes, vão ao lado do label.
 * Mantém o JSX da sidebar burra (só recebe os números).
 */
export type SidebarBadges = {
  leadsNovos: number;
  emNegociacao: number;
  lotesParados: number;
};

export async function loadSidebarBadges(
  corretoraId: string,
): Promise<SidebarBadges> {
  if (!corretoraId) {
    return { leadsNovos: 0, emNegociacao: 0, lotesParados: 0 };
  }
  const supabase = await createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS).toISOString();

  const [novos, emNeg, lotesParados] = await Promise.all([
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("status", "novo"),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("status", "em_negociacao"),
    supabase
      .from("lotes")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("status", "classificado")
      .lt("updated_at", sevenDaysAgo),
  ]);

  return {
    leadsNovos: novos.count ?? 0,
    emNegociacao: emNeg.count ?? 0,
    lotesParados: lotesParados.count ?? 0,
  };
}

/**
 * Sugestões de automação comercial — regras simples baseadas em tempo.
 * Não disparam ações automáticas; só apontam o que merece atenção do
 * corretor agora.
 */
export type AutomationSuggestion = {
  id: "leads-frios" | "lotes-parados" | "negociacoes-paradas";
  count: number;
  /** href pra onde clicar leva o corretor. */
  href: string;
};

export async function loadAutomationSuggestions(
  corretoraId: string,
): Promise<AutomationSuggestion[]> {
  if (!corretoraId) return [];

  const now = Date.now();
  const supabase = await createClient();

  const [leadsFrios, lotesParados, negociacoesParadas] = await Promise.all([
    // Lead novo há mais de 24h
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("status", "novo")
      .lt("created_at", new Date(now - 1 * DAY_MS).toISOString()),
    // Lote classificado parado há mais de 7d
    supabase
      .from("lotes")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("status", "classificado")
      .lt("updated_at", new Date(now - 7 * DAY_MS).toISOString()),
    // Lead em negociação sem update há mais de 3d
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("status", "em_negociacao")
      .lt("updated_at", new Date(now - 3 * DAY_MS).toISOString()),
  ]);

  return [
    {
      id: "leads-frios",
      count: leadsFrios.count ?? 0,
      href: "/painel/corretora/leads?status=novo",
    },
    {
      id: "lotes-parados",
      count: lotesParados.count ?? 0,
      href: "/painel/corretora/lotes?status=classificado",
    },
    {
      id: "negociacoes-paradas",
      count: negociacoesParadas.count ?? 0,
      href: "/painel/corretora/leads?status=em_negociacao",
    },
  ];
}
