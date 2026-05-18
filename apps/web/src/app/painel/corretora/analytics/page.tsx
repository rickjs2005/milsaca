import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Card,
} from "@/components/ui/card";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Percent,
  Target,
  Wallet,
  Coffee,
} from "lucide-react";
import { getProfile } from "@/lib/auth";
import {
  loadAnalyticsKpis,
  loadComissaoAcumulada,
  loadFunilLeads,
  loadLeadsPorMes,
  loadMixCafe,
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

export default async function AnalyticsPage() {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const corretoraId = profile.corretora_id;
  const [kpis, leadsMes, funil, comissaoMes, mix, topCompradores] =
    await Promise.all([
      loadAnalyticsKpis(corretoraId),
      loadLeadsPorMes(corretoraId),
      loadFunilLeads(corretoraId),
      loadComissaoAcumulada(corretoraId),
      loadMixCafe(corretoraId),
      loadTopCompradores(corretoraId, 5),
    ]);

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
        <p className="text-sm text-milsaca-verde-claro">
          Visão da operação dos últimos meses.
        </p>
      </header>

      {ehVazio ? (
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardContent className="py-10 text-center text-sm text-milsaca-verde-claro">
            Sem dados ainda. Cadastre leads, contratos e entregas pra começar a
            ver as métricas.
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Ticket médio"
              value={BRL.format(kpis.ticketMedio)}
              hint="por contrato ativo/finalizado"
              Icon={Wallet}
            />
            <KpiCard
              label="Conversão"
              value={`${kpis.conversaoPct.toFixed(1)}%`}
              hint="leads convertidos / total"
              Icon={Percent}
            />
            <KpiCard
              label="Contratos ativos"
              value={String(kpis.totalContratosAtivos)}
              hint="em execução agora"
              Icon={Target}
            />
            <KpiCard
              label="Comissão no ano"
              value={BRL.format(kpis.comissaoAcumuladaAno)}
              hint="ano corrente, ativos + finalizados"
              Icon={Wallet}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Leads por mês"
              description="últimos 6 meses"
            >
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
                <CardContent className="p-0">
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

function KpiCard({
  label,
  value,
  hint,
  Icon,
}: {
  label: string;
  value: string;
  hint: string;
  Icon: typeof Wallet;
}) {
  return (
    <Card className="border-milsaca-cream-escuro">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-xs uppercase tracking-wider">
          {label}
        </CardDescription>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight text-milsaca-verde">
          {value}
        </p>
        <p className="mt-1 text-xs text-milsaca-verde-claro">{hint}</p>
      </CardContent>
    </Card>
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
    <Card className="border-milsaca-cream-escuro">
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
