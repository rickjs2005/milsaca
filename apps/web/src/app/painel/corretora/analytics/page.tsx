import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Coffee,
  Handshake,
  Info,
  Package,
  Percent,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { ResponsiveTable } from "@/components/responsive-table";
import { getProfile } from "@/lib/auth";
import { getCorretoraSubscriptionInfo } from "../_lib/corretora";
import { isProOrAbove } from "../_lib/plan-gate";
import { LockedHint } from "../_components/locked-hint";
import { loadAnalytics, type TopComprador } from "./_lib/queries";
import { parsePeriod } from "./_lib/period";
import { PeriodSelector } from "./_components/period-selector";
import {
  ComissaoAcumuladaChart,
  FunilLeadsChart,
  LeadsPorMesChart,
  MixCafeChart,
} from "./_components/charts";
import { fmtMoney0, fmtInt } from "@/lib/format";

export const metadata = { title: "Analytics — Painel da corretora" };

const LEADS = "/painel/corretora/leads";
const CONTRATOS = "/painel/corretora/contratos";

type SearchParams = Promise<{ periodo?: string }>;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const corretoraId = profile.corretora_id;
  const period = parsePeriod((await searchParams).periodo);
  const nowMs = Date.now();

  const [data, subscription] = await Promise.all([
    loadAnalytics(corretoraId, period, nowMs),
    getCorretoraSubscriptionInfo(corretoraId),
  ]);
  const isPro = isProOrAbove(subscription);
  const { flow, snapshot } = data;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-milsaca-cafezal">Analytics</h1>
          <p className="mt-1 text-body-sm text-neutral-600">
            Como a operação está convertendo — leads, propostas, sacas e
            comissão. Período: <strong>{data.periodLabel}</strong>.
          </p>
        </div>
        <PeriodSelector value={period} />
      </header>

      {!isPro ? (
        <LockedHint
          feature="analytics"
          description="Veja taxa de conversão, mix de café, top compradores e tendências mensais. Disponível no plano Premium."
        />
      ) : null}

      {data.isEmpty ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="py-10 text-center text-body-sm text-neutral-500">
            Sem dados ainda. Cadastre leads, contratos e entregas pra começar a
            ver as métricas.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs de fluxo (período + delta + drill-down) */}
          <section
            aria-label="Indicadores do período"
            className="grid grid-cols-2 gap-4 xl:grid-cols-4"
          >
            <KpiLink href={LEADS}>
              <KpiCard
                label="Leads novos"
                value={fmtInt(flow.leadsNovos.value)}
                icon={Handshake}
                tone="premium"
                delta={flow.leadsNovos.delta}
              />
            </KpiLink>
            <KpiLink href={`${LEADS}?status=convertido`}>
              <KpiCard
                label="Convertidos"
                value={fmtInt(flow.convertidos.value)}
                icon={CheckCircle2}
                tone="premium"
                delta={flow.convertidos.delta}
              />
            </KpiLink>
            <KpiLink href={LEADS}>
              <KpiCard
                label="Taxa de conversão"
                value={`${flow.conversaoPct.value.toFixed(1)}%`}
                icon={Percent}
                tone="premium"
                delta={flow.conversaoPct.delta}
                hint="Convertidos / leads novos no período"
              />
            </KpiLink>
            <KpiLink href={CONTRATOS}>
              <KpiCard
                label="Comissão"
                value={fmtMoney0(flow.comissao.value)}
                icon={Wallet}
                tone="premium"
                delta={flow.comissao.delta}
                hint="Contratos assinados no período"
              />
            </KpiLink>
          </section>

          {/* KPIs de estado (snapshot — sem período/delta) */}
          <section
            aria-label="Estado atual"
            className="grid grid-cols-2 gap-4 xl:grid-cols-4"
          >
            <KpiLink href={CONTRATOS}>
              <KpiCard
                label="Sacas vendidas"
                value={fmtInt(flow.sacasVendidas.value)}
                icon={ShoppingBag}
                tone="success"
                delta={flow.sacasVendidas.delta}
                hint="Em contratos do período"
              />
            </KpiLink>
            <KpiCard
              label="Sacas em negociação"
              value={fmtInt(snapshot.sacasEmNegociacao)}
              icon={Package}
              tone="info"
              hint="Em leads abertos agora"
            />
            <KpiLink href="/painel/corretora/produtores">
              <KpiCard
                label="Produtores ativos"
                value={fmtInt(snapshot.produtoresAtivos)}
                icon={Users}
                hint="Com leads, lotes ou contratos"
              />
            </KpiLink>
            <KpiLink href="/painel/corretora/compradores">
              <KpiCard
                label="Compradores ativos"
                value={fmtInt(snapshot.compradoresAtivos)}
                icon={Building2}
                hint="Cadastrados como ativos"
              />
            </KpiLink>
          </section>

          {/* Charts */}
          <section className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Leads por mês"
              description={
                data.primeiroMesComDado
                  ? `tendência (6m) · dados a partir de ${data.primeiroMesComDado}`
                  : "tendência dos últimos 6 meses"
              }
            >
              <LeadsPorMesChart data={data.trendLeads} />
            </ChartCard>

            <ChartCard
              title="Funil de leads"
              description={`distribuição por status · ${data.periodLabel.toLowerCase()}`}
            >
              <FunilLeadsChart data={data.funil} />
            </ChartCard>

            <ChartCard
              title="Comissão acumulada"
              description="soma acumulada nos últimos 12 meses (só sobe)"
            >
              <ComissaoAcumuladaChart data={data.trendComissao} />
            </ChartCard>

            <ChartCard
              title="Mix de café"
              description={`sacas em contratos · ${data.periodLabel.toLowerCase()}`}
            >
              {data.mix.length === 0 ? (
                <p className="py-12 text-center text-caption text-neutral-500">
                  Sem contratos com café atribuído no período.
                </p>
              ) : (
                <MixCafeChart data={data.mix} />
              )}
            </ChartCard>
          </section>

          {/* Origem dos leads */}
          <section className="space-y-3">
            <h2 className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
              Origem dos leads · {data.periodLabel.toLowerCase()}
            </h2>
            <Card>
              <CardContent className="space-y-4 p-card">
                {data.origem ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <OrigemRow label="WhatsApp" count={data.origem.whatsapp} total={data.origem.total} tone="whatsapp" />
                      <OrigemRow label="Formulário público" count={data.origem.formulario} total={data.origem.total} tone="sky" />
                      <OrigemRow label="Vitrine Milsaca" count={data.origem.vitrine} total={data.origem.total} tone="dourado" />
                      <OrigemRow label="Cadastro manual" count={data.origem.manual} total={data.origem.total} tone="slate" />
                    </div>
                    {data.origem.semOrigem > 0 ? (
                      <p className="flex items-start gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-caption text-neutral-500">
                        <Info className="mt-0.5 h-3 w-3 shrink-0" />
                        {data.origem.semOrigem}{" "}
                        {data.origem.semOrigem === 1 ? "lead legado" : "leads legados"}{" "}
                        sem origem informada (cadastrados antes do rastreio por
                        canal).
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="py-4 text-center text-body-sm text-neutral-500">
                    Nenhum lead novo no período pra calcular a origem.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Ticket médio + contratos ativos */}
          <section className="grid grid-cols-2 gap-4">
            <KpiCard
              label="Ticket médio"
              value={fmtMoney0(snapshot.ticketMedio)}
              hint="por contrato ativo/finalizado"
              icon={Wallet}
            />
            <KpiLink href={CONTRATOS}>
              <KpiCard
                label="Contratos ativos"
                value={fmtInt(snapshot.contratosAtivos)}
                hint="em execução agora"
                icon={Handshake}
              />
            </KpiLink>
          </section>

          {/* Top compradores */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-neutral-500">
              <Coffee className="h-4 w-4" />
              Top compradores · {data.periodLabel.toLowerCase()}
            </h2>
            {data.topCompradores.length === 0 ? (
              <Card tone="muted" className="border-dashed">
                <CardContent className="py-6 text-center text-body-sm text-neutral-500">
                  Nenhum contrato com comprador vinculado no período.
                </CardContent>
              </Card>
            ) : (
              <ResponsiveTable<TopComprador>
                columns={[
                  { key: "comprador", label: "Comprador", align: "left" },
                  { key: "contratos", label: "Contratos", align: "right" },
                  { key: "volume", label: "Volume total", align: "right" },
                  { key: "comissao", label: "Comissão", align: "right" },
                ]}
                rows={data.topCompradores}
                keyFor={(c) => c.id}
                renderRow={(c) => (
                  <>
                    <td className="px-5 py-3">
                      <Link
                        href={`/painel/corretora/compradores/${c.id}`}
                        className="font-medium text-milsaca-cafezal hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right text-neutral-600">
                      {c.contratos}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-neutral-600">
                      {fmtMoney0(c.total)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-milsaca-cafezal">
                      {fmtMoney0(c.comissao)}
                    </td>
                  </>
                )}
                renderCard={(c) => (
                  <Link
                    href={`/painel/corretora/compradores/${c.id}`}
                    className="block rounded-card border border-neutral-200 bg-white p-card shadow-card transition-colors hover:border-milsaca-dourado"
                  >
                    <p className="font-medium text-milsaca-cafezal">{c.name}</p>
                    <p className="mt-1 text-caption text-neutral-500">
                      {c.contratos}{" "}
                      {c.contratos === 1 ? "contrato" : "contratos"} ·{" "}
                      {fmtMoney0(c.total)} em volume
                    </p>
                    <p className="mt-2 text-h3 tabular-nums text-milsaca-cafezal">
                      {fmtMoney0(c.comissao)}
                      <span className="ml-1 text-caption font-normal text-neutral-400">
                        comissão
                      </span>
                    </p>
                  </Link>
                )}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function KpiLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {children}
    </Link>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-h3 text-milsaca-cafezal">{title}</CardTitle>
        <CardDescription className="text-caption text-neutral-500">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function OrigemRow({
  label,
  count,
  total,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  tone: "whatsapp" | "sky" | "dourado" | "slate";
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const barColor: Record<typeof tone, string> = {
    whatsapp: "bg-[#25D366]",
    sky: "bg-info-500",
    dourado: "bg-milsaca-dourado",
    slate: "bg-neutral-400",
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-caption text-milsaca-cafezal">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-neutral-500">
          {count} · {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
        <div
          className={`h-full ${barColor[tone]} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

