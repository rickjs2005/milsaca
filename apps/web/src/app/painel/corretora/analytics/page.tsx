import { redirect } from "next/navigation";
import {
  BarChart3,
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
import { getProfile } from "@/lib/auth";
import { getCorretoraSubscriptionInfo } from "../_lib/corretora";
import { isProOrAbove } from "../_lib/plan-gate";
import { LockedHint } from "../_components/locked-hint";
import {
  loadAnalyticsExtras,
  loadAnalyticsKpis,
  loadComissaoAcumulada,
  loadFunilLeads,
  loadLeadsPorMes,
  loadMixCafe,
  loadOrigemLeads,
  loadTopCompradores,
} from "./_lib/queries";
import {
  ComissaoAcumuladaChart,
  FunilLeadsChart,
  LeadsPorMesChart,
  MixCafeChart,
} from "./_components/charts";

export const metadata = { title: "Analytics — Painel da corretora" };

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat("pt-BR");

export default async function AnalyticsPage() {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const corretoraId = profile.corretora_id;
  const [
    kpis,
    extras,
    leadsMes,
    funil,
    comissaoMes,
    mix,
    topCompradores,
    origem,
    subscription,
  ] = await Promise.all([
    loadAnalyticsKpis(corretoraId),
    loadAnalyticsExtras(corretoraId),
    loadLeadsPorMes(corretoraId),
    loadFunilLeads(corretoraId),
    loadComissaoAcumulada(corretoraId),
    loadMixCafe(corretoraId),
    loadTopCompradores(corretoraId, 5),
    loadOrigemLeads(corretoraId),
    getCorretoraSubscriptionInfo(corretoraId),
  ]);

  const isPro = isProOrAbove(subscription);

  const ehVazio =
    funil.every((f) => f.count === 0) &&
    leadsMes.every((m) => m.valor === 0) &&
    comissaoMes.every((m) => m.valor === 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-milsaca-verde">
          <BarChart3 className="h-7 w-7" />
          Analytics
        </h1>
        <p className="mt-1 text-sm text-milsaca-verde-claro">
          Como a operação está convertendo — leads, propostas, sacas e comissão.
        </p>
      </header>

      {!isPro ? (
        <LockedHint
          feature="analytics"
          description="Veja taxa de conversão, mix de café, top compradores e tendências mensais. Disponível no plano Corretora Pro."
        />
      ) : null}

      {ehVazio ? (
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardContent className="py-10 text-center text-sm text-milsaca-verde-claro">
            Sem dados ainda. Cadastre leads, contratos e entregas pra começar a
            ver as métricas.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs principais (premium) */}
          <section
            aria-label="Indicadores principais"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <KpiCard
              label="Leads novos no mês"
              value={NUM.format(extras.leadsNovosMes)}
              icon={Handshake}
              tone="premium"
              hint="Criados a partir do dia 1"
            />
            <KpiCard
              label="Convertidos no mês"
              value={NUM.format(extras.convertidosMes)}
              icon={CheckCircle2}
              tone="premium"
              hint="Fechamentos no mês corrente"
            />
            <KpiCard
              label="Taxa de conversão"
              value={`${kpis.conversaoPct.toFixed(1)}%`}
              icon={Percent}
              tone="premium"
              hint="Convertidos / total de leads"
            />
            <KpiCard
              label="Comissão no ano"
              value={BRL.format(kpis.comissaoAcumuladaAno)}
              icon={Wallet}
              tone="premium"
              hint="Contratos ativos + finalizados"
            />
          </section>

          {/* KPIs secundários */}
          <section
            aria-label="Indicadores complementares"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <KpiCard
              label="Sacas em negociação"
              value={NUM.format(extras.sacasEmNegociacao)}
              icon={Package}
              tone="info"
              hint="Em leads abertos"
            />
            <KpiCard
              label="Sacas vendidas no mês"
              value={NUM.format(extras.sacasVendidasMes)}
              icon={ShoppingBag}
              tone="success"
              hint="Em contratos assinados no mês"
            />
            <KpiCard
              label="Produtores ativos"
              value={NUM.format(extras.produtoresAtivos)}
              icon={Users}
              hint="Com leads, lotes ou contratos"
            />
            <KpiCard
              label="Compradores ativos"
              value={NUM.format(extras.compradoresAtivos)}
              icon={Building2}
              hint="Cadastrados como ativos"
            />
          </section>

          {/* Charts */}
          <section className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Leads por mês" description="últimos 6 meses">
              <LeadsPorMesChart data={leadsMes} />
            </ChartCard>

            <ChartCard
              title="Funil de leads"
              description="distribuição por status"
            >
              <FunilLeadsChart data={funil} />
            </ChartCard>

            <ChartCard
              title="Comissão acumulada"
              description="últimos 12 meses"
            >
              <ComissaoAcumuladaChart data={comissaoMes} />
            </ChartCard>

            <ChartCard
              title="Mix de café"
              description="sacas em contratos ativos/finalizados"
            >
              {mix.length === 0 ? (
                <p className="py-12 text-center text-xs text-milsaca-verde-claro">
                  Sem contratos com café atribuído ainda.
                </p>
              ) : (
                <MixCafeChart data={mix} />
              )}
            </ChartCard>
          </section>

          {/* Origem dos leads */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
              Origem dos leads
            </h2>
            <Card className="border-milsaca-cream-escuro">
              <CardContent className="space-y-4 p-5">
                {origem ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <OrigemRow
                        label="WhatsApp"
                        count={origem.whatsapp}
                        total={origem.total}
                        tone="whatsapp"
                      />
                      <OrigemRow
                        label="Formulário público"
                        count={origem.formulario}
                        total={origem.total}
                        tone="sky"
                      />
                      <OrigemRow
                        label="Vitrine Milsaca"
                        count={origem.vitrine}
                        total={origem.total}
                        tone="dourado"
                      />
                      <OrigemRow
                        label="Cadastro manual"
                        count={origem.manual}
                        total={origem.total}
                        tone="slate"
                      />
                    </div>
                    {origem.semOrigem > 0 ? (
                      <p className="flex items-start gap-2 rounded-md border border-milsaca-cream-escuro bg-milsaca-cream/50 px-3 py-2 text-[11px] text-milsaca-verde-claro">
                        <Info className="mt-0.5 h-3 w-3 shrink-0 text-milsaca-verde-claro" />
                        {origem.semOrigem}{" "}
                        {origem.semOrigem === 1 ? "lead legado" : "leads legados"}{" "}
                        sem origem informada (cadastrados antes do rastreio por
                        canal).
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="py-4 text-center text-sm text-milsaca-verde-claro">
                    Sem leads suficientes pra calcular a origem ainda.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Ticket médio + contratos ativos (linha discreta) */}
          <section className="grid gap-4 sm:grid-cols-2">
            <KpiCard
              label="Ticket médio"
              value={BRL.format(kpis.ticketMedio)}
              hint="por contrato ativo/finalizado"
              icon={Wallet}
            />
            <KpiCard
              label="Contratos ativos"
              value={NUM.format(kpis.totalContratosAtivos)}
              hint="em execução agora"
              icon={Handshake}
            />
          </section>

          {/* Top compradores */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
              <Coffee className="h-4 w-4" />
              Top compradores
            </h2>
            {topCompradores.length === 0 ? (
              <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
                <CardContent className="py-6 text-center text-sm text-milsaca-verde-claro">
                  Nenhum contrato com comprador vinculado ainda.
                </CardContent>
              </Card>
            ) : (
              <Card className="border-milsaca-cream-escuro">
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-milsaca-cream-escuro/30 text-left text-xs uppercase tracking-wider text-milsaca-verde-claro">
                      <tr>
                        <th className="px-5 py-3">Comprador</th>
                        <th className="px-5 py-3">Contratos</th>
                        <th className="px-5 py-3">Volume total</th>
                        <th className="px-5 py-3 text-right">Comissão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCompradores.map((c) => (
                        <tr
                          key={c.id}
                          className="border-t border-milsaca-cream-escuro"
                        >
                          <td className="px-5 py-3 font-medium text-milsaca-verde">
                            {c.name}
                          </td>
                          <td className="px-5 py-3 text-milsaca-verde-claro">
                            {c.contratos}
                          </td>
                          <td className="px-5 py-3 text-milsaca-verde-claro">
                            {BRL.format(c.total)}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-milsaca-verde">
                            {BRL.format(c.comissao)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </section>
        </>
      )}
    </div>
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
    <Card className="border-milsaca-cream-escuro shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-milsaca-verde">{title}</CardTitle>
        <CardDescription className="text-xs text-milsaca-verde-claro">
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
    sky: "bg-sky-500",
    dourado: "bg-milsaca-dourado",
    slate: "bg-slate-400",
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs text-milsaca-verde">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-milsaca-verde-claro">
          {count} · {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-milsaca-cream-escuro">
        <div
          className={`h-full ${barColor[tone]} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
