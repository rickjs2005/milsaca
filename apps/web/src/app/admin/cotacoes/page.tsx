import { TrendingUp, Coffee, DollarSign, Clock } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, type Column } from "@/components/data-table";
import { fmtDateTime, fmtBRL } from "@/lib/format";

type KpiTone = "default" | "success" | "warning" | "danger";

export const metadata = { title: "Cotações · Admin Milsaca" };

type MarketQuote = {
  source: string;
  symbol: string;
  price_brl_cents: number | null;
  price_usd_cents: number | null;
  variation_pct: number | null;
  quoted_at: string;
  fetched_at: string;
  source_url: string | null;
};

type ManualQuote = {
  source: string;
  total: number;
};

function statusTone(ageHours: number): KpiTone {
  if (ageHours < 24) return "success";
  if (ageHours < 48) return "warning";
  return "danger";
}

function statusLabel(ageHours: number): string {
  if (ageHours < 24) return "Recente";
  if (ageHours < 48) return "Velho";
  return "Crítico";
}

export default async function CotacoesAdminPage() {
  await requireAppAdmin();
  const supabase = await createClient();

  const [
    { data: marketRows },
    { data: lastSync },
    { count: cotacoesManuais },
    { data: corretorasComCotacao },
  ] = await Promise.all([
    supabase
      .from("market_quotes")
      .select(
        "source, symbol, price_brl_cents, price_usd_cents, variation_pct, quoted_at, fetched_at, source_url",
      )
      .order("fetched_at", { ascending: false })
      .limit(50),
    supabase
      .from("market_quotes")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("cotacoes")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("cotacoes")
      .select("source, corretora_id")
      .limit(500),
  ]);

  const quotes = (marketRows ?? []) as MarketQuote[];
  const ageMs = lastSync?.fetched_at
    ? Date.now() - new Date(lastSync.fetched_at).getTime()
    : Infinity;
  const ageHours = Math.floor(ageMs / 3_600_000);

  // Agrupa cotações manuais por source pra dashboard.
  const manualBySource = new Map<string, number>();
  for (const c of (corretorasComCotacao ?? []) as { source: string | null }[]) {
    const k = c.source ?? "manual";
    manualBySource.set(k, (manualBySource.get(k) ?? 0) + 1);
  }
  const manualBreakdown: ManualQuote[] = Array.from(
    manualBySource.entries(),
  ).map(([source, total]) => ({ source, total }));

  // Latest snapshot por (source, symbol) — primeiro encontro no order desc.
  const latestKey = new Set<string>();
  const latest = quotes.filter((q) => {
    const k = `${q.source}|${q.symbol}`;
    if (latestKey.has(k)) return false;
    latestKey.add(k);
    return true;
  });

  const columns: Column<MarketQuote>[] = [
    {
      key: "source",
      header: "Fonte",
      mobileLabel: "Fonte",
      cell: (q) => (
        <span className="font-mono text-xs text-slate-700">{q.source}</span>
      ),
    },
    {
      key: "symbol",
      header: "Símbolo",
      mobileLabel: "Símbolo",
      cell: (q) => (
        <span className="text-sm font-medium text-slate-900">{q.symbol}</span>
      ),
    },
    {
      key: "brl",
      header: "BRL",
      mobileLabel: "BRL",
      cell: (q) =>
        q.price_brl_cents != null ? fmtBRL(q.price_brl_cents) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: "usd",
      header: "USD¢",
      cell: (q) =>
        q.price_usd_cents != null ? (
          <span className="text-sm text-slate-700">
            US$ {(q.price_usd_cents / 100).toFixed(2)}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
      hideOnMobile: true,
    },
    {
      key: "variation",
      header: "Δ%",
      cell: (q) => {
        if (q.variation_pct == null)
          return <span className="text-slate-400">—</span>;
        const pos = q.variation_pct > 0;
        const neg = q.variation_pct < 0;
        return (
          <span
            className={
              pos
                ? "text-xs font-medium text-emerald-600"
                : neg
                  ? "text-xs font-medium text-rose-600"
                  : "text-xs text-slate-500"
            }
          >
            {pos ? "+" : ""}
            {q.variation_pct.toFixed(2)}%
          </span>
        );
      },
    },
    {
      key: "quoted",
      header: "Cotada em",
      cell: (q) => (
        <span className="text-xs text-slate-500">{fmtDateTime(q.quoted_at)}</span>
      ),
      hideOnMobile: true,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Compliance"
        title="Cotações"
        description="Monitor de cotações de mercado coletadas pelo cron sync-cotacoes (CEPEA + ICE + BCB) e contagem de cotações manuais postadas pelas corretoras."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Cotações" },
        ]}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Snapshots no mercado"
          value={latest.length}
          icon={TrendingUp}
          hint="Pares (fonte, símbolo) ativos."
        />
        <KpiCard
          label="Cotações manuais"
          value={cotacoesManuais ?? 0}
          icon={Coffee}
          hint="Postadas pela corretora no painel."
        />
        <KpiCard
          label="Última sincronização"
          value={
            lastSync?.fetched_at ? `${Math.max(0, ageHours)}h` : "—"
          }
          icon={Clock}
          tone={
            lastSync?.fetched_at
              ? (statusTone(ageHours) === "success"
                  ? "success"
                  : statusTone(ageHours) === "warning"
                    ? "warning"
                    : "danger")
              : "default"
          }
          hint={
            lastSync?.fetched_at
              ? fmtDateTime(lastSync.fetched_at)
              : "Cron ainda não rodou."
          }
        />
        <KpiCard
          label="Status sync"
          value={
            lastSync?.fetched_at ? statusLabel(ageHours) : "Pendente"
          }
          icon={DollarSign}
          tone={
            lastSync?.fetched_at ? statusTone(ageHours) : "default"
          }
          hint="OK se <24h, Crítico se >48h."
        />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Snapshot atual do mercado
        </h2>
        <DataTable
          columns={columns}
          data={latest}
          rowKey={(q) => `${q.source}|${q.symbol}`}
          empty={
            <EmptyState
              compact
              icon={TrendingUp}
              title="Nenhuma cotação sincronizada ainda"
              description="O cron sync-cotacoes roda 21:00 UTC dias úteis. Verifique em /admin/automacoes se está agendado e veja /admin/fila-eventos pra falhas."
              secondaryCta={{ label: "Ver automações", href: "/admin/automacoes" }}
            />
          }
        />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Cotações manuais por fonte
        </h2>
        {manualBreakdown.length === 0 ? (
          <div className="rounded-card border border-slate-200 bg-white shadow-card">
            <EmptyState
              compact
              icon={Coffee}
              title="Sem cotações manuais"
              description="Corretoras ainda não postaram cotações na praça delas."
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {manualBreakdown
              .sort((a, b) => b.total - a.total)
              .map((m) => (
                <div
                  key={m.source}
                  className="rounded-card border border-slate-200 bg-white p-4 shadow-card"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {m.source || "—"}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-milsaca-preto">
                    {m.total}
                  </p>
                </div>
              ))}
          </div>
        )}
      </section>
    </>
  );
}
