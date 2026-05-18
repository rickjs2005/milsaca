import Link from "next/link";
import { requireAppAdmin } from "@/lib/auth";
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

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Métricas
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Crescimento da plataforma e composição das assinaturas.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="MRR" value={formatBRL(m.mrrCents)} />
        <KpiCard label="ARPU" value={formatBRL(m.arpuCents)} hint="Receita / cliente ativo" />
        <KpiCard
          label="Assinaturas ativas"
          value={
            m.subsByStatus.find((s) => s.status === "active")?.count ?? 0
          }
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Novas corretoras / mês"
          subtitle="Últimos 6 meses"
        >
          <MonthlyBarChart data={m.signupsByMonth} />
        </Panel>

        <Panel title="Composição das assinaturas">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatusPieChart data={m.subsByStatus} />
            <ul className="space-y-2 text-sm">
              {m.subsByStatus.map((s) => (
                <li
                  key={s.status}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span className="text-slate-700">
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                  <span className="font-semibold text-slate-900">
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
          <MonthlyBarChart data={m.contratosByMonth} color="#2D3A2E" />
        </Panel>

        <Panel
          title="Cliques WhatsApp / mês"
          subtitle="Cliques no botão de contato no catálogo"
        >
          <MonthlyLineChart data={m.whatsappByMonth} color="#059669" />
        </Panel>
      </div>

      <Panel title="Top corretoras por contratos" subtitle="All-time">
        {m.topCorretoras.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Sem contratos ainda.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {m.topCorretoras.map((c, i) => (
              <li
                key={i}
                className="flex items-center justify-between py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-milsaca-dourado/15 text-xs font-semibold text-milsaca-dourado">
                    {i + 1}
                  </span>
                  <span className="font-medium text-slate-900">{c.name}</span>
                </div>
                <span className="font-semibold text-slate-700">
                  {c.contratos} contrato{c.contratos === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="text-center text-xs text-slate-400">
        Cálculos feitos em memória; volumes baixos justificam.{" "}
        <Link href="/admin" className="text-milsaca-dourado hover:underline">
          ← Dashboard
        </Link>
      </p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {hint ? (
        <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
      ) : null}
    </div>
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
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle ? (
          <p className="text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
