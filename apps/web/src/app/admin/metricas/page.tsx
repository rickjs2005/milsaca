import { Building2, TrendingUp, Wallet } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { formatBRL, loadDetailedMetrics } from "../_lib/metricas";
import {
  MonthlyBarChart,
  MonthlyLineChart,
  StatusPieChart,
} from "./_components/charts";

export const metadata = { title: "Métricas · Admin Milsaca" };

const STATUS_LABEL: Record<string, string> = {
  trial: "Trial",
  active: "Ativa",
  past_due: "Vencida",
  canceled: "Cancelada",
  expired: "Expirada",
};

export default async function MetricasAdminPage() {
  await requireAppAdmin();
  const m = await loadDetailedMetrics();
  const activeCount =
    m.subsByStatus.find((s) => s.status === "active")?.count ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Métricas"
        description="Crescimento da plataforma e composição das assinaturas. Cálculos em memória — válidos pra volume atual."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Métricas" },
        ]}
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="MRR"
          value={formatBRL(m.mrrCents)}
          icon={Wallet}
          tone="premium"
        />
        <KpiCard
          label="ARPU"
          value={formatBRL(m.arpuCents)}
          icon={TrendingUp}
          hint="Receita / cliente ativo."
        />
        <KpiCard
          label="Assinaturas ativas"
          value={activeCount}
          icon={Building2}
          tone="success"
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Novas corretoras / mês" subtitle="Últimos 6 meses">
          <MonthlyBarChart data={m.signupsByMonth} />
        </Panel>

        <Panel title="Composição das assinaturas">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatusPieChart data={m.subsByStatus} />
            <ul className="space-y-2 text-sm">
              {m.subsByStatus.map((s) => (
                <li
                  key={s.status}
                  className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"
                >
                  <span className="text-slate-700">
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                  <span className="font-semibold text-milsaca-preto">
                    {s.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel title="Leads novos / mês" subtitle="Últimos 6 meses">
          <MonthlyLineChart data={m.leadsByMonth} />
        </Panel>

        <Panel title="Contratos / mês" subtitle="Últimos 6 meses">
          <MonthlyBarChart data={m.contratosByMonth} color="#0F3D2E" />
        </Panel>

        <Panel
          title="Cliques WhatsApp / mês"
          subtitle="Cliques no botão de contato no catálogo"
        >
          <MonthlyLineChart data={m.whatsappByMonth} color="#1B5E3F" />
        </Panel>
      </div>

      <Panel title="Top corretoras por contratos" subtitle="All-time">
        {m.topCorretoras.length === 0 ? (
          <EmptyState
            compact
            icon={Building2}
            title="Sem contratos ainda"
            description="Quando corretoras começarem a fechar contratos, o ranking aparece aqui."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {m.topCorretoras.map((c, i) => (
              <li
                key={i}
                className="flex items-center justify-between py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-milsaca-dourado/15 text-xs font-semibold text-milsaca-cafezal">
                    {i + 1}
                  </span>
                  <span className="font-medium text-slate-900">{c.name}</span>
                </div>
                <span className="font-semibold text-slate-700">
                  {c.contratos} {c.contratos === 1 ? "contrato" : "contratos"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-slate-200 bg-white p-6 shadow-card">
      <header className="mb-4">
        <h2 className="text-base font-semibold text-milsaca-preto">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
