import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ChevronRight,
  Clock,
  FileSignature,
  Handshake,
  MessageCircle,
  Package,
  PackageX,
  ScrollText,
  Sprout,
  Wallet,
} from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { formatBRL, loadDashboardMetrics } from "./_lib/metricas";
import { ActivityFeed } from "./_components/activity-feed";
import { PlatformHealth } from "./_components/platform-health";

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

  const sacasAnomalia =
    metrics.contratosFinalizadosPendentes > 0 || metrics.contratosExcedente > 0;
  const hasAlerts =
    metrics.pendentesCount > 0 ||
    metrics.trialsExpiringIn7d > 0 ||
    metrics.pastDueSubs > 0 ||
    sacasAnomalia;

  return (
    <>
      <PageHeader
        eyebrow="Visão geral"
        title="Comando da plataforma"
        description={`Estado do Milsaca em ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })} — números do banco em tempo real.`}
      />

      {/* Alertas inteligentes */}
      {hasAlerts ? (
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.pendentesCount > 0 ? (
            <AlertCard
              href="/admin/aprovacoes"
              tone="premium"
              icon={ScrollText}
              title={`${metrics.pendentesCount} ${metrics.pendentesCount === 1 ? "corretora aguardando" : "corretoras aguardando"}`}
              description="Solicitações novas via cadastro público."
              cta="Revisar"
            />
          ) : null}
          {metrics.trialsExpiringIn7d > 0 ? (
            <AlertCard
              href="/admin/assinaturas"
              tone="info"
              icon={Clock}
              title={`${metrics.trialsExpiringIn7d} ${metrics.trialsExpiringIn7d === 1 ? "trial expira" : "trials expiram"} em 7 dias`}
              description="Boa janela pra cobrança e ativação."
              cta="Ver assinaturas"
            />
          ) : null}
          {metrics.pastDueSubs > 0 ? (
            <AlertCard
              href="/admin/assinaturas"
              tone="danger"
              icon={AlertTriangle}
              title={`${metrics.pastDueSubs} ${metrics.pastDueSubs === 1 ? "assinatura vencida" : "assinaturas vencidas"}`}
              description="Período encerrou e ainda não renovou."
              cta="Tratar agora"
            />
          ) : null}
          {metrics.contratosFinalizadosPendentes > 0 ? (
            <AlertCard
              href="/admin/metricas#sacas"
              tone="danger"
              icon={PackageX}
              title={`${metrics.sacasResiduais} ${metrics.sacasResiduais === 1 ? "saca pendente" : "sacas pendentes"} em ${metrics.contratosFinalizadosPendentes} ${metrics.contratosFinalizadosPendentes === 1 ? "contrato finalizado" : "contratos finalizados"}`}
              description="Contrato finalizado com saldo de sacas em aberto — reconciliar."
              cta="Investigar"
            />
          ) : null}
          {metrics.contratosExcedente > 0 ? (
            <AlertCard
              href="/admin/metricas#sacas"
              tone="danger"
              icon={AlertTriangle}
              title={`${metrics.contratosExcedente} ${metrics.contratosExcedente === 1 ? "contrato com excedente" : "contratos com excedente"}`}
              description="Sacas entregues acima do contratado — verificar."
              cta="Investigar"
            />
          ) : null}
        </div>
      ) : null}

      {/* Receita */}
      <SectionLabel>Receita</SectionLabel>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="MRR estimado"
          value={formatBRL(metrics.mrrCents)}
          icon={Wallet}
          tone="premium"
          hint="Receita recorrente mensal (planos active)."
        />
        <KpiCard
          label="Corretoras ativas"
          value={metrics.activeSubs}
          icon={Building2}
          tone="success"
          hint="Assinatura paga e em dia."
        />
        <KpiCard
          label="Em trial"
          value={metrics.trialSubs}
          icon={Clock}
          tone="info"
          hint="Período gratuito vigente."
        />
        <KpiCard
          label="Vencidas"
          value={metrics.pastDueSubs}
          icon={AlertTriangle}
          tone={metrics.pastDueSubs > 0 ? "danger" : "default"}
          hint="Renovação atrasada."
        />
      </div>

      {/* Volume */}
      <SectionLabel>Volume da plataforma</SectionLabel>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Corretoras"
          value={metrics.corretorasTotal}
          icon={Building2}
        />
        <KpiCard
          label="Produtores"
          value={metrics.produtoresTotal}
          icon={Sprout}
        />
        <KpiCard label="Leads" value={metrics.leadsTotal} icon={Handshake} />
        <KpiCard
          label="Contratos"
          value={metrics.contratosTotal}
          icon={FileSignature}
        />
        <KpiCard
          label="Laudos COB"
          value={metrics.laudosTotal}
          icon={ScrollText}
          hint={
            metrics.novosLaudos30d > 0
              ? `+${metrics.novosLaudos30d} nos últimos 30d`
              : undefined
          }
        />
        <KpiCard
          label="Sacas a entregar"
          value={metrics.sacasAEntregar}
          icon={Package}
          tone={metrics.sacasResiduais > 0 ? "danger" : "default"}
          hint={
            metrics.sacasResiduais > 0
              ? `${metrics.sacasResiduais} residuais em finalizados`
              : "Pendentes em contratos ativos."
          }
        />
      </div>

      {/* Aquisição */}
      <SectionLabel>Aquisição (30d)</SectionLabel>
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="WhatsApp"
          value={metrics.whatsappClicks30d}
          icon={MessageCircle}
          hint="Cliques produtor → corretora."
        />
        <KpiCard
          label="Novos leads"
          value={metrics.novosLeads30d}
          icon={Handshake}
        />
        <KpiCard
          label="Novos contratos"
          value={metrics.novosContratos30d}
          icon={FileSignature}
        />
        <KpiCard
          label="Novos laudos"
          value={metrics.novosLaudos30d}
          icon={ScrollText}
        />
      </div>

      {/* Saúde + Atividade */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PlatformHealth cotacoesLastSync={metrics.cotacoesLastSync} />
        <ActivityFeed />
      </div>

      {/* Últimas corretoras + Atalhos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-slate-200 bg-white p-6 shadow-card">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-milsaca-preto">
                Últimas corretoras
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Cadastros mais recentes.
              </p>
            </div>
            <Link
              href="/admin/corretoras"
              className="text-xs font-medium text-milsaca-cafezal hover:underline underline-offset-4"
            >
              Ver todas →
            </Link>
          </header>
          {(ultimasCorretoras?.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Nenhuma corretora cadastrada ainda.
            </p>
          ) : (
            <ul className="-mx-2 divide-y divide-slate-100">
              {(ultimasCorretoras ?? []).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/corretoras/${c.id}`}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-3 transition-colors hover:bg-milsaca-cream/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {c.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {[c.city, c.state].filter(Boolean).join(" / ") || "—"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-card border border-slate-200 bg-milsaca-cream-claro/30 p-6">
          <header className="mb-4">
            <h2 className="text-base font-semibold text-milsaca-preto">
              Atalhos
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Ações mais frequentes do admin.
            </p>
          </header>
          <ul className="grid gap-2">
            <ShortcutItem
              href="/admin/corretoras/nova"
              label="Cadastrar corretora manualmente"
            />
            <ShortcutItem href="/admin/planos/novo" label="Novo plano" />
            <ShortcutItem
              href="/admin/assinaturas"
              label="Gerenciar assinaturas"
            />
            <ShortcutItem
              href="/admin/metricas"
              label="Métricas detalhadas"
            />
            <ShortcutItem
              href="/admin/seguranca"
              label="Segurança da conta admin"
            />
          </ul>
        </section>
      </div>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
      {children}
    </h2>
  );
}

function ShortcutItem({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-card transition-all hover:border-milsaca-dourado hover:shadow-card-hover hover:text-milsaca-cafezal"
      >
        <span>{label}</span>
        <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-milsaca-cafezal" />
      </Link>
    </li>
  );
}

type AlertTone = "premium" | "info" | "danger";

function AlertCard({
  href,
  tone,
  icon: Icon,
  title,
  description,
  cta,
}: {
  href: string;
  tone: AlertTone;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  cta: string;
}) {
  const TONE_BORDER: Record<AlertTone, string> = {
    premium: "border-milsaca-dourado/60 bg-milsaca-dourado/8",
    info: "border-info-100 bg-info-50",
    danger: "border-danger-100 bg-danger-50",
  };
  const TONE_ICON: Record<AlertTone, string> = {
    premium: "bg-milsaca-dourado/20 text-milsaca-cafezal",
    info: "bg-info-100 text-info-700",
    danger: "bg-danger-100 text-danger-700",
  };
  const TONE_CTA: Record<AlertTone, string> = {
    premium: "text-milsaca-cafezal",
    info: "text-info-700",
    danger: "text-danger-700",
  };
  return (
    <Link
      href={href}
      className={`group flex items-start gap-3 rounded-card border p-4 transition-shadow hover:shadow-card ${TONE_BORDER[tone]}`}
    >
      <span
        aria-hidden
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TONE_ICON[tone]}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs text-slate-600">{description}</p>
      </div>
      <span
        className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${TONE_CTA[tone]}`}
      >
        {cta}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
