import { createClient } from "@milsaca/db/web/server";

type SubStatus = "trial" | "active" | "past_due" | "canceled" | "expired";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DashboardMetrics = {
  corretorasTotal: number;
  produtoresTotal: number;
  usuariosTotal: number;
  leadsTotal: number;
  contratosTotal: number;
  pendentesCount: number;
  laudosTotal: number;
  // Conservação de sacas (reconciliação)
  sacasAEntregar: number; // pendentes em contratos ATIVOS (pipeline normal)
  contratosFinalizadosPendentes: number; // ANOMALIA: finalizado com saldo aberto
  sacasResiduais: number; // sacas "sumidas" em contratos finalizados
  contratosExcedente: number; // ANOMALIA: entregue > contratado
  // Assinaturas
  mrrCents: number;
  activeSubs: number;
  trialSubs: number;
  trialsExpiringIn7d: number;
  pastDueSubs: number;
  // Movimento últimos 30d
  novosLeads30d: number;
  novosContratos30d: number;
  whatsappClicks30d: number;
  novosLaudos30d: number;
  // Saúde plataforma
  cotacoesLastSync: string | null;
};

export async function loadDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createClient();
  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * DAY_MS).toISOString();
  const ago30d = new Date(now.getTime() - 30 * DAY_MS).toISOString();
  const nowIso = now.toISOString();

  const [
    { count: corretorasTotal },
    { count: produtoresTotal },
    { count: usuariosTotal },
    { count: leadsTotal },
    { count: contratosTotal },
    { count: pendentesCount },
    { count: laudosTotal },
    { count: activeSubs },
    { count: trialSubs },
    { count: pastDueSubs },
    { count: trialsExpiringIn7d },
    { count: novosLeads30d },
    { count: novosContratos30d },
    { count: whatsappClicks30d },
    { count: novosLaudos30d },
    { data: activeSubsRows },
    { data: cotacaoMaisRecente },
    { data: contratosSaldoRows },
    { data: entregasSaldoRows },
  ] = await Promise.all([
    supabase.from("corretoras").select("*", { count: "exact", head: true }),
    supabase.from("produtores").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    // Só contratos "reais" (assinados/concluídos) — rascunho/em_análise/cancelado
    // não são volume de negócio (achado: KPI que mente).
    supabase
      .from("contratos")
      .select("*", { count: "exact", head: true })
      .in("status", ["ativo", "finalizado"]),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente")
      .contains("roles", ["corretora"]),
    supabase
      .from("classificacoes_cob")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "trial"),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "past_due"),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "trial")
      .gte("trial_ends_at", nowIso)
      .lte("trial_ends_at", in7d),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", ago30d),
    supabase
      .from("contratos")
      .select("*", { count: "exact", head: true })
      .in("status", ["ativo", "finalizado"])
      .gte("created_at", ago30d),
    supabase
      .from("whatsapp_leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", ago30d),
    supabase
      .from("classificacoes_cob")
      .select("*", { count: "exact", head: true })
      .gte("created_at", ago30d),
    supabase
      .from("subscriptions")
      .select("plans(price_cents, billing_period)")
      .eq("status", "active"),
    supabase
      .from("market_quotes")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Conservação de sacas: contratos reais + suas entregas não-canceladas.
    // Agregamos em JS (escala-piloto) pra não depender da view nos tipos
    // gerados (ver feedback_supabase_gen_types_lixo).
    supabase
      .from("contratos")
      .select("id, status, bag_count")
      .in("status", ["ativo", "finalizado"]),
    supabase
      .from("entregas")
      .select("contrato_id, bag_count, status")
      .neq("status", "cancelada"),
  ]);

  // Reconciliação de sacas por contrato (identidade contratado = entregue +
  // em_transito + pendente). "registrado" = soma das entregas não-canceladas.
  type ContratoSaldoRow = {
    id: string;
    status: string;
    bag_count: number | null;
  };
  type EntregaSaldoRow = { contrato_id: string; bag_count: number | null };
  const registradoPorContrato = new Map<string, number>();
  for (const e of (entregasSaldoRows ?? []) as EntregaSaldoRow[]) {
    registradoPorContrato.set(
      e.contrato_id,
      (registradoPorContrato.get(e.contrato_id) ?? 0) + (e.bag_count ?? 0),
    );
  }
  let sacasAEntregar = 0;
  let contratosFinalizadosPendentes = 0;
  let sacasResiduais = 0;
  let contratosExcedente = 0;
  for (const c of (contratosSaldoRows ?? []) as ContratoSaldoRow[]) {
    const contratado = c.bag_count ?? 0;
    if (contratado <= 0) continue;
    const registrado = registradoPorContrato.get(c.id) ?? 0;
    const pendente = contratado - registrado;
    if (pendente > 0) {
      if (c.status === "finalizado") {
        // Finalizado com saldo aberto = as sacas que "sumiam" (anomalia).
        contratosFinalizadosPendentes += 1;
        sacasResiduais += pendente;
      } else {
        // Ativo: pendente é pipeline normal (ainda a entregar).
        sacasAEntregar += pendente;
      }
    } else if (pendente < 0) {
      contratosExcedente += 1;
    }
  }

  // MRR = soma dos planos active normalizados pra valor mensal
  type Joined = { plans: { price_cents: number; billing_period: "monthly" | "yearly" } | null };
  const rows = (activeSubsRows ?? []) as unknown as Joined[];
  const mrrCents = rows.reduce((acc, row) => {
    const p = row.plans;
    if (!p) return acc;
    const monthly =
      p.billing_period === "yearly" ? p.price_cents / 12 : p.price_cents;
    return acc + monthly;
  }, 0);

  return {
    corretorasTotal: corretorasTotal ?? 0,
    produtoresTotal: produtoresTotal ?? 0,
    usuariosTotal: usuariosTotal ?? 0,
    leadsTotal: leadsTotal ?? 0,
    contratosTotal: contratosTotal ?? 0,
    pendentesCount: pendentesCount ?? 0,
    laudosTotal: laudosTotal ?? 0,
    sacasAEntregar,
    contratosFinalizadosPendentes,
    sacasResiduais,
    contratosExcedente,
    mrrCents: Math.round(mrrCents),
    activeSubs: activeSubs ?? 0,
    trialSubs: trialSubs ?? 0,
    trialsExpiringIn7d: trialsExpiringIn7d ?? 0,
    pastDueSubs: pastDueSubs ?? 0,
    novosLeads30d: novosLeads30d ?? 0,
    novosContratos30d: novosContratos30d ?? 0,
    whatsappClicks30d: whatsappClicks30d ?? 0,
    novosLaudos30d: novosLaudos30d ?? 0,
    cotacoesLastSync:
      (cotacaoMaisRecente as { fetched_at: string } | null)?.fetched_at ?? null,
  };
}

// Re-export do helper centralizado em lib/format.ts — mantém o nome
// "formatBRL" usado por 14 arquivos que já importavam daqui.
export { fmtBRL as formatBRL } from "@/lib/format";

type MonthBucket = {
  ym: string; // "2026-05"
  label: string; // "Mai/26"
  value: number;
};

function monthBuckets(months: number): MonthBucket[] {
  const out: MonthBucket[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d
      .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
      .replace(".", "");
    out.push({ ym, label, value: 0 });
  }
  return out;
}

function ymOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Conta linhas de uma tabela agrupadas por mês de created_at, últimos N meses.
 */
async function countByMonth(
  table:
    | "leads"
    | "contratos"
    | "corretoras"
    | "subscriptions"
    | "whatsapp_leads",
  months: number,
): Promise<MonthBucket[]> {
  const supabase = await createClient();
  const buckets = monthBuckets(months);
  const first = buckets[0]?.ym ?? "";
  const earliest = first ? new Date(`${first}-01T00:00:00`).toISOString() : null;

  if (!earliest) return buckets;

  const { data } = await supabase
    .from(table)
    .select("created_at")
    .gte("created_at", earliest);

  const map = new Map(buckets.map((b) => [b.ym, b]));
  for (const row of data ?? []) {
    const rec = row as { created_at: string };
    const ym = ymOf(rec.created_at);
    const b = map.get(ym);
    if (b) b.value += 1;
  }
  return buckets;
}

export type DetailedMetrics = {
  signupsByMonth: MonthBucket[];
  leadsByMonth: MonthBucket[];
  contratosByMonth: MonthBucket[];
  whatsappByMonth: MonthBucket[];
  subsByStatus: { status: SubStatus; count: number }[];
  mrrCents: number;
  arpuCents: number;
  topCorretoras: { name: string; contratos: number }[];
};

const STATUSES: SubStatus[] = [
  "trial",
  "active",
  "past_due",
  "canceled",
  "expired",
];

export async function loadDetailedMetrics(): Promise<DetailedMetrics> {
  const supabase = await createClient();

  const [
    signupsByMonth,
    leadsByMonth,
    contratosByMonth,
    whatsappByMonth,
    statusCountsRaw,
    { data: activeSubsRows },
    { data: contratosByCorretora },
  ] = await Promise.all([
    countByMonth("corretoras", 6),
    countByMonth("leads", 6),
    countByMonth("contratos", 6),
    countByMonth("whatsapp_leads", 6),
    Promise.all(
      STATUSES.map(async (s) => {
        const { count } = await supabase
          .from("subscriptions")
          .select("*", { count: "exact", head: true })
          .eq("status", s);
        return { status: s, count: count ?? 0 };
      }),
    ),
    supabase
      .from("subscriptions")
      .select("plans(price_cents, billing_period)")
      .eq("status", "active"),
    supabase
      .from("contratos")
      .select("corretora_id, corretoras(name)")
      .in("status", ["ativo", "finalizado"])
      .limit(2000),
  ]);

  type Joined = { plans: { price_cents: number; billing_period: "monthly" | "yearly" } | null };
  const rows = (activeSubsRows ?? []) as unknown as Joined[];
  const mrrCents = rows.reduce((acc, row) => {
    const p = row.plans;
    if (!p) return acc;
    const monthly =
      p.billing_period === "yearly" ? p.price_cents / 12 : p.price_cents;
    return acc + monthly;
  }, 0);
  const arpuCents = rows.length > 0 ? Math.round(mrrCents / rows.length) : 0;

  type ContratoRow = { corretora_id: string; corretoras: { name: string } | null };
  const contratos = (contratosByCorretora ?? []) as unknown as ContratoRow[];
  const byCorretora = new Map<string, { name: string; contratos: number }>();
  for (const c of contratos) {
    const key = c.corretora_id;
    const name = c.corretoras?.name ?? "—";
    const cur = byCorretora.get(key) ?? { name, contratos: 0 };
    cur.contratos += 1;
    byCorretora.set(key, cur);
  }
  const topCorretoras = [...byCorretora.values()]
    .sort((a, b) => b.contratos - a.contratos)
    .slice(0, 5);

  return {
    signupsByMonth,
    leadsByMonth,
    contratosByMonth,
    whatsappByMonth,
    subsByStatus: statusCountsRaw,
    mrrCents: Math.round(mrrCents),
    arpuCents,
    topCorretoras,
  };
}
