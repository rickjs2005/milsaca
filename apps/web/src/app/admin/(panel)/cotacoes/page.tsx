import Link from "next/link";
import { TrendingUp, Coffee, DollarSign, Clock, Plus } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { fmtDateTime, fmtBRL, fmtDate, fmtMoney } from "@/lib/format";
import { deleteCotacaoAdmin } from "./_actions";

export const metadata = { title: "Cotações · Admin Milsaca" };

type KpiTone = "default" | "success" | "warning" | "danger";

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
  id: string;
  corretora_id: string;
  coffee_type: string;
  specie: string | null;
  process: string | null;
  region: string | null;
  source: string | null;
  reference_date: string;
  price: number;
  created_at: string;
  corretoras: { name: string } | { name: string }[] | null;
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

function processoLabel(p: string | null): string {
  if (!p) return "—";
  const labels: Record<string, string> = {
    natural: "Natural",
    cereja_descascado: "Cereja descascado",
    cd_desmucilado: "CD desmucilado",
    despolpado: "Despolpado",
    fermentacao_induzida: "Fermentação induzida",
  };
  return labels[p] ?? p;
}

export default async function CotacoesAdminPage() {
  await requireAppAdmin();
  const supabase = await createClient();

  const [
    { data: marketRows },
    { data: lastSync },
    { count: cotacoesManuais },
    { data: cotacoesList },
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
    supabase.from("cotacoes").select("*", { count: "exact", head: true }),
    supabase
      .from("cotacoes")
      .select(
        "id, corretora_id, coffee_type, specie, process, region, source, reference_date, price, created_at, corretoras(name)",
      )
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const quotes = (marketRows ?? []) as MarketQuote[];
  const ageMs = lastSync?.fetched_at
    ? Date.now() - new Date(lastSync.fetched_at).getTime()
    : Infinity;
  const ageHours = Math.floor(ageMs / 3_600_000);

  const manualRaw = (cotacoesList ?? []) as unknown as ManualQuote[];
  const manuals = manualRaw.map((m) => ({
    ...m,
    corretoraName: Array.isArray(m.corretoras)
      ? m.corretoras[0]?.name ?? null
      : m.corretoras?.name ?? null,
  }));

  // Latest snapshot por (source, symbol) — primeiro encontro no order desc.
  const latestKey = new Set<string>();
  const latest = quotes.filter((q) => {
    const k = `${q.source}|${q.symbol}`;
    if (latestKey.has(k)) return false;
    latestKey.add(k);
    return true;
  });

  const marketColumns: Column<MarketQuote>[] = [
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
        q.price_brl_cents != null ? (
          fmtBRL(q.price_brl_cents)
        ) : (
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
        <span className="text-xs text-slate-500">
          {fmtDateTime(q.quoted_at)}
        </span>
      ),
      hideOnMobile: true,
    },
  ];

  type ManualRow = (typeof manuals)[number];

  const manualColumns: Column<ManualRow>[] = [
    {
      key: "data",
      header: "Data",
      mobileLabel: "Data",
      cell: (c) => (
        <span className="whitespace-nowrap text-xs text-slate-600">
          {fmtDate(c.reference_date)}
        </span>
      ),
    },
    {
      key: "corretora",
      header: "Corretora",
      mobileLabel: "Corretora",
      cell: (c) =>
        c.corretoraName ? (
          <span className="text-sm font-medium text-slate-900">
            {c.corretoraName}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: "cafe",
      header: "Café",
      mobileLabel: "Café",
      cell: (c) => (
        <div>
          <p className="text-sm text-slate-900">
            {c.specie === "arabica"
              ? "Arábica"
              : c.specie === "conillon"
                ? "Conillón"
                : c.coffee_type}
          </p>
          <p className="text-[11px] text-slate-500">
            {processoLabel(c.process)}
          </p>
        </div>
      ),
    },
    {
      key: "regiao",
      header: "Praça",
      mobileLabel: "Praça",
      cell: (c) => c.region ?? <span className="text-slate-400">—</span>,
      hideOnMobile: true,
    },
    {
      key: "preco",
      header: "Preço/saca",
      mobileLabel: "Preço",
      align: "right",
      cell: (c) => (
        <span className="font-mono text-sm font-semibold text-milsaca-cafezal">
          {fmtMoney(c.price)}
        </span>
      ),
    },
    {
      key: "fonte",
      header: "Fonte",
      cell: (c) => (
        <span className="text-xs text-slate-500">
          {c.source ?? <span className="text-slate-400">—</span>}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      align: "right",
      cell: (c) => (
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/admin/cotacoes/${c.id}`}
            className="text-xs font-medium text-milsaca-cafezal underline-offset-4 hover:underline"
          >
            Editar
          </Link>
          <form action={deleteCotacaoAdmin}>
            <input type="hidden" name="id" value={c.id} />
            <ConfirmSubmit
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              confirmTitle="Apagar cotação?"
              confirmMessage={
                <p>
                  Cotação de <strong>{c.corretoraName ?? "—"}</strong> em{" "}
                  <strong>{fmtDate(c.reference_date)}</strong> ({fmtMoney(c.price)}
                  ) será removida pra sempre. Produtor deixa de ver no app.
                </p>
              }
              confirmButtonLabel="Apagar"
              confirmButtonVariant="destructive"
              pendingLabel="Apagando..."
            >
              Apagar
            </ConfirmSubmit>
          </form>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Compliance"
        title="Cotações"
        description="Monitor de cotações de mercado (CEPEA + ICE + BCB) sincronizadas pelo cron + lista de cotações manuais que admin posta em nome das corretoras."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Cotações" },
        ]}
        actions={
          <Button
            asChild
            className="bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
          >
            <Link href="/admin/cotacoes/nova">
              <Plus className="mr-1.5 h-4 w-4" />
              Nova cotação manual
            </Link>
          </Button>
        }
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
          hint="Postadas em nome de corretoras."
        />
        <KpiCard
          label="Última sincronização"
          value={
            lastSync?.fetched_at ? `${Math.max(0, ageHours)}h` : "—"
          }
          icon={Clock}
          tone={
            lastSync?.fetched_at
              ? statusTone(ageHours) === "success"
                ? "success"
                : statusTone(ageHours) === "warning"
                  ? "warning"
                  : "danger"
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
          value={lastSync?.fetched_at ? statusLabel(ageHours) : "Pendente"}
          icon={DollarSign}
          tone={lastSync?.fetched_at ? statusTone(ageHours) : "default"}
          hint="OK se <24h, Crítico se >48h."
        />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Cotações manuais (todas as corretoras)
        </h2>
        <DataTable
          columns={manualColumns}
          data={manuals}
          rowKey={(c) => c.id}
          empty={
            <EmptyState
              compact
              icon={Coffee}
              title="Nenhuma cotação manual ainda"
              description="Clique em 'Nova cotação manual' acima pra postar a primeira em nome de uma corretora. Ela aparece automaticamente no app do produtor com o nome da corretora."
              cta={{
                label: "Cadastrar primeira cotação",
                href: "/admin/cotacoes/nova",
              }}
            />
          }
        />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Snapshot do mercado (automático — sync-cotacoes)
        </h2>
        <DataTable
          columns={marketColumns}
          data={latest}
          rowKey={(q) => `${q.source}|${q.symbol}`}
          empty={
            <EmptyState
              compact
              icon={TrendingUp}
              title="Nenhuma cotação sincronizada ainda"
              description="O cron sync-cotacoes roda 21:00 UTC dias úteis. Verifique em /admin/automacoes se está agendado."
              secondaryCta={{
                label: "Ver automações",
                href: "/admin/automacoes",
              }}
            />
          }
        />
      </section>
    </>
  );
}
