import Link from "next/link";
import {
  Building2,
  Sprout,
  Handshake,
  FileSignature,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Clock,
  MessageCircle,
} from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { formatBRL, loadDashboardMetrics } from "./_lib/metricas";

export const metadata = { title: "Admin · Milsaca" };

export default async function AdminPage() {
  await requireAppAdmin();
  const supabase = await createClient();

  const [metrics, { data: ultimasCorretoras }] = await Promise.all([
    loadDashboardMetrics(),
    supabase
      .from("corretoras")
      .select("id, name, slug, city, state, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Visão geral da plataforma · {new Date().toLocaleDateString("pt-BR")}
        </p>
      </div>

      {metrics.pendentesCount > 0 ? (
        <Link
          href="/admin/aprovacoes"
          className="flex items-center justify-between rounded-2xl border border-milsaca-dourado bg-milsaca-dourado/10 px-5 py-4 transition hover:bg-milsaca-dourado/20"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {metrics.pendentesCount} corretora
              {metrics.pendentesCount === 1 ? "" : "s"} aguardando aprovação
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Solicitações novas de cadastro pelo app.
            </p>
          </div>
          <span className="text-sm font-medium text-milsaca-dourado">
            Revisar →
          </span>
        </Link>
      ) : null}

      {metrics.trialsExpiringIn7d > 0 || metrics.pastDueSubs > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {metrics.trialsExpiringIn7d > 0 ? (
            <Link
              href="/admin/assinaturas"
              className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 hover:bg-blue-100"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    {metrics.trialsExpiringIn7d} trial
                    {metrics.trialsExpiringIn7d === 1 ? "" : "s"} expirando em 7 dias
                  </p>
                  <p className="text-xs text-blue-700">
                    Boa hora pra cobrar.
                  </p>
                </div>
              </div>
            </Link>
          ) : null}
          {metrics.pastDueSubs > 0 ? (
            <Link
              href="/admin/assinaturas"
              className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    {metrics.pastDueSubs} assinatura
                    {metrics.pastDueSubs === 1 ? "" : "s"} vencida
                    {metrics.pastDueSubs === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-amber-700">
                    Período acabou e não renovou.
                  </p>
                </div>
              </div>
            </Link>
          ) : null}
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Receita
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi
            label="MRR"
            value={formatBRL(metrics.mrrCents)}
            icon={Wallet}
            hint="Receita recorrente mensal estimada"
          />
          <Kpi
            label="Corretoras ativas"
            value={metrics.activeSubs}
            icon={Building2}
            hint="Assinatura paga em dia"
          />
          <Kpi
            label="Em trial"
            value={metrics.trialSubs}
            icon={Clock}
            hint="Período gratuito ativo"
          />
          <Kpi
            label="Vencidas"
            value={metrics.pastDueSubs}
            icon={AlertTriangle}
            hint="Period_end passado"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Volume da plataforma
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <Kpi
            label="Corretoras"
            value={metrics.corretorasTotal}
            icon={Building2}
            href="/admin/corretoras"
          />
          <Kpi
            label="Produtores"
            value={metrics.produtoresTotal}
            icon={Sprout}
          />
          <Kpi label="Leads" value={metrics.leadsTotal} icon={Handshake} />
          <Kpi
            label="Contratos"
            value={metrics.contratosTotal}
            icon={FileSignature}
          />
          <Kpi
            label="Movimento 30d"
            value={`+${metrics.novosLeads30d}/+${metrics.novosContratos30d}`}
            icon={TrendingUp}
            hint="Leads / contratos novos"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Aquisição
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi
            label="Cliques WhatsApp 30d"
            value={metrics.whatsappClicks30d}
            icon={MessageCircle}
            hint="Produtor → corretora"
            href="/admin/leads"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Últimas corretoras
            </h2>
            <Link
              href="/admin/corretoras"
              className="text-xs text-milsaca-dourado hover:underline"
            >
              Ver todas →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-slate-100">
            {(ultimasCorretoras ?? []).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">
                    {[c.city, c.state].filter(Boolean).join("/") || "—"}
                  </p>
                </div>
                <span className="font-mono text-[10px] text-slate-400">
                  {c.slug}
                </span>
              </li>
            ))}
            {(ultimasCorretoras?.length ?? 0) === 0 ? (
              <li className="py-6 text-center text-sm text-slate-500">
                Nenhuma corretora ainda.
              </li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-base font-semibold text-slate-900">Atalhos</h2>
          <div className="mt-4 grid gap-2">
            <ShortcutLink href="/admin/metricas">
              Ver métricas detalhadas
            </ShortcutLink>
            <ShortcutLink href="/admin/planos/novo">
              + Novo plano
            </ShortcutLink>
            <ShortcutLink href="/admin/corretoras/nova">
              + Cadastrar corretora manualmente
            </ShortcutLink>
            <ShortcutLink href="/admin/assinaturas">
              Gerenciar assinaturas
            </ShortcutLink>
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  icon: typeof Building2;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-milsaca-dourado">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function ShortcutLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 hover:border-milsaca-dourado hover:text-slate-900"
    >
      {children}
    </Link>
  );
}
