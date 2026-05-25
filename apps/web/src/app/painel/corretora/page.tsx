import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  Coffee,
  Handshake,
  TrendingUp as TrendingUpIcon,
  FileSignature,
  Truck,
  Wallet,
  Package,
  Users,
  Building2,
  Coins,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import { IndicadoresLive } from "@/components/indicadores-live";
import type { LeadStatus } from "@milsaca/types";
import { getProfile } from "@/lib/auth";
import { listEntregasHojeEAtrasadas } from "./entregas/_lib/queries";
import {
  loadDashboardKpis,
  loadLeadsRecentes,
  loadCotacoesDashboard,
  loadAutomationSuggestions,
  type CotacaoDashboard,
} from "./_lib/dashboard";
import { getCorretoraSubscriptionInfo } from "./_lib/corretora";
import { isProOrAbove } from "./_lib/plan-gate";
import { AutomationCard } from "./_components/automation-card";
import { LockedHint } from "./_components/locked-hint";

export const metadata = { title: "Início — Painel da corretora" };

const COFFEE_LABEL: Record<string, string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export default async function InicioCorretoraPage() {
  const profile = await getProfile();
  const corretoraId = profile?.corretora_id ?? "";

  const [kpis, leads, cotacoes, entregasSnap, suggestions, subscription] =
    await Promise.all([
      loadDashboardKpis(corretoraId),
      loadLeadsRecentes(corretoraId),
      loadCotacoesDashboard(),
      corretoraId
        ? listEntregasHojeEAtrasadas(corretoraId)
        : Promise.resolve({ hoje: [], atrasadas: [] }),
      loadAutomationSuggestions(corretoraId),
      corretoraId
        ? getCorretoraSubscriptionInfo(corretoraId)
        : Promise.resolve(null),
    ]);

  const operationEmpty =
    kpis.lotesAtivos === 0 &&
    kpis.produtoresCadastrados === 0 &&
    kpis.compradoresAtivos === 0;
  const isPro = isProOrAbove(subscription);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
            Central comercial
          </h1>
          <p className="mt-1 text-sm text-milsaca-verde-claro">
            Resumo da sua operação, oportunidades em aberto e mercado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/painel/corretora/lotes/novo"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-milsaca-dourado/40 bg-milsaca-dourado/15 px-3 text-xs font-semibold text-milsaca-cafezal transition-colors hover:bg-milsaca-dourado/25"
          >
            <Package className="h-3.5 w-3.5" />
            Cadastrar lote
          </Link>
          <Link
            href="/painel/corretora/leads/novo"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-milsaca-cafezal px-3 text-xs font-semibold text-milsaca-cream transition-colors hover:bg-milsaca-folha"
          >
            <Handshake className="h-3.5 w-3.5" />
            Novo lead
          </Link>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* KPIs principais (dourado/premium)                                */}
      {/* ---------------------------------------------------------------- */}
      <section
        aria-label="Indicadores principais"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="Sacas disponíveis"
          value={NUM.format(kpis.sacasDisponiveis)}
          icon={Coffee}
          tone="premium"
          hint="Em lotes classificados e aguardando"
        />
        <KpiCard
          label="Lotes ativos"
          value={NUM.format(kpis.lotesAtivos)}
          icon={Package}
          tone="premium"
          hint="Aptos pra negociação"
        />
        <KpiCard
          label="Leads novos"
          value={NUM.format(kpis.leadsNovos)}
          icon={Handshake}
          tone="premium"
          hint="Aguardando primeiro contato"
        />
        <KpiCard
          label="Receita do mês"
          value={BRL.format(kpis.receitaMes)}
          icon={Wallet}
          tone="premium"
          hint="Comissão de contratos ativos e finalizados"
        />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* KPIs secundários                                                  */}
      {/* ---------------------------------------------------------------- */}
      <section
        aria-label="Outros indicadores"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="Em negociação"
          value={NUM.format(kpis.emNegociacao)}
          icon={TrendingUpIcon}
          tone="info"
          hint="Propostas abertas"
        />
        <KpiCard
          label="Produtores"
          value={NUM.format(kpis.produtoresCadastrados)}
          icon={Users}
          hint="Contatos cadastrados na corretora"
        />
        <KpiCard
          label="Compradores"
          value={NUM.format(kpis.compradoresAtivos)}
          icon={Building2}
          hint="Compradores ativos"
        />
        <KpiCard
          label="Contratos ativos"
          value={NUM.format(kpis.contratosAtivos)}
          icon={FileSignature}
          tone="success"
          hint="Em execução"
        />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Estado vazio — corretora ainda nem começou a usar               */}
      {/* ---------------------------------------------------------------- */}
      {operationEmpty ? <FirstStepsCard /> : null}

      {/* ---------------------------------------------------------------- */}
      {/* Automação comercial                                                */}
      {/* ---------------------------------------------------------------- */}
      {isPro ? (
        <AutomationCard suggestions={suggestions} />
      ) : (
        <LockedHint
          feature="automacao"
          description="Sugestões automáticas de follow-up: leads sem contato há mais de 24h, lotes parados há mais de 7 dias, negociações esquecidas. Disponível no plano Corretora Pro."
        />
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Entregas hoje + atrasadas                                          */}
      {/* ---------------------------------------------------------------- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
            <Truck className="h-4 w-4" />
            Entregas pra acompanhar
          </h2>
          <Link
            href="/painel/corretora/entregas"
            className="text-xs font-medium text-milsaca-cafezal hover:underline"
          >
            Ver todas →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <EntregasMiniCard
            label="Atrasadas"
            count={entregasSnap.atrasadas.length}
            tone="warn"
            items={entregasSnap.atrasadas}
          />
          <EntregasMiniCard
            label="Hoje"
            count={entregasSnap.hoje.length}
            tone="info"
            items={entregasSnap.hoje}
          />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Leads recentes                                                    */}
      {/* ---------------------------------------------------------------- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
            Leads recentes
          </h2>
          <Link
            href="/painel/corretora/leads"
            className="text-xs font-medium text-milsaca-cafezal hover:underline"
          >
            Ver central de leads →
          </Link>
        </div>
        {leads.length === 0 ? (
          <EmptyCard
            title="Nenhum lead na sua corretora ainda."
            description="Compartilhe seu perfil público pra começar a receber contatos de produtores e compradores."
            cta={{ href: "/painel/corretora/perfil", label: "Ver perfil público" }}
          />
        ) : (
          <Card className="border-milsaca-cream-escuro">
            <CardContent className="divide-y divide-milsaca-cream-escuro p-0">
              {leads.map((l) => (
                <Link
                  key={l.id}
                  href={`/painel/corretora/leads/${l.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-milsaca-cream/40"
                >
                  <div>
                    <p className="font-medium text-milsaca-verde">
                      {l.produtor}
                    </p>
                    <p className="text-xs text-milsaca-verde-claro">
                      {l.bag_count ? `${l.bag_count} sacas` : "—"} ·{" "}
                      {l.coffee_type
                        ? (COFFEE_LABEL[l.coffee_type] ?? l.coffee_type)
                        : "—"}{" "}
                      · {l.data}
                    </p>
                  </div>
                  <StatusBadge status={l.status} />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <IndicadoresLive />

      {/* ---------------------------------------------------------------- */}
      {/* Cotações                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
            Cotações manuais da praça
          </h2>
          <Link
            href="/painel/corretora/cotacoes"
            className="text-xs font-medium text-milsaca-cafezal hover:underline"
          >
            Gerenciar →
          </Link>
        </div>
        {cotacoes.length === 0 ? (
          <EmptyCard
            title="Nenhuma cotação registrada ainda."
            description="Adicione cotações da sua praça pra acompanhar o mercado e usar como referência em propostas."
            cta={{
              href: "/painel/corretora/cotacoes",
              label: "Registrar cotação",
            }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {cotacoes.map((c) => (
              <CotacaoCardView key={c.coffee_type} cotacao={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ====================================================================== */
/* Subcomponentes                                                         */
/* ====================================================================== */

function FirstStepsCard() {
  return (
    <section className="rounded-card border border-milsaca-dourado/30 bg-gradient-to-br from-milsaca-cream-claro/40 via-white to-white p-6 shadow-card sm:p-8">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-milsaca-dourado/20 text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/40">
          <Coins className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-milsaca-verde">
            Sua corretora está pronta. Hora de começar a operar.
          </h2>
          <p className="text-sm text-milsaca-verde-claro">
            Configure o básico abaixo pra começar a receber produtores e
            organizar suas negociações.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <FirstStep
          href="/painel/corretora/produtores/novo"
          icon={Users}
          title="Conecte produtores"
          description="Cadastre o primeiro produtor pra começar a montar sua carteira."
        />
        <FirstStep
          href="/painel/corretora/lotes/novo"
          icon={Package}
          title="Cadastre um lote"
          description="Lance o primeiro lote de café pra atrair interessados."
        />
        <FirstStep
          href="/painel/corretora/compradores/novo"
          icon={Building2}
          title="Conecte compradores"
          description="Registre quem compra de você pra agilizar futuros contratos."
        />
      </div>
    </section>
  );
}

function FirstStep({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Users;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-lg border border-milsaca-cream-escuro bg-white p-4 transition-all hover:border-milsaca-dourado/50 hover:shadow-card-hover"
    >
      <Icon className="h-4 w-4 text-milsaca-cafezal" />
      <p className="text-sm font-semibold text-milsaca-verde">{title}</p>
      <p className="text-xs leading-relaxed text-milsaca-verde-claro">
        {description}
      </p>
      <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-milsaca-cafezal group-hover:gap-2 transition-all">
        Começar
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

function CotacaoCardView({ cotacao }: { cotacao: CotacaoDashboard }) {
  const up = (cotacao.variacao ?? 0) >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  const label = COFFEE_LABEL[cotacao.coffee_type] ?? cotacao.coffee_type;
  return (
    <Card className="border-milsaca-cream-escuro">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-milsaca-dourado/15 text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/40">
            <Coffee className="h-4 w-4" />
          </span>
          <CardTitle className="text-base">{label}</CardTitle>
        </div>
        {cotacao.variacao !== null && (
          <span
            className={
              up
                ? "flex items-center gap-0.5 text-sm font-medium text-emerald-700"
                : "flex items-center gap-0.5 text-sm font-medium text-rose-700"
            }
          >
            <Arrow className="h-4 w-4" />
            {up ? "+" : ""}
            {cotacao.variacao.toFixed(1)}%
          </span>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          {BRL.format(cotacao.price)}
        </p>
        <p className="mt-1 text-xs text-milsaca-verde-claro">
          saca 60kg · {cotacao.source ?? "—"}
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyCard({
  title,
  description,
  cta,
}: {
  title: string;
  description: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="rounded-card border border-dashed border-milsaca-cream-escuro bg-white/40 px-6 py-8 text-center">
      <p className="text-sm font-medium text-milsaca-verde">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-milsaca-verde-claro">
        {description}
      </p>
      {cta ? (
        <Link
          href={cta.href}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-milsaca-dourado/40 bg-milsaca-dourado/15 px-3 py-1.5 text-xs font-semibold text-milsaca-cafezal transition-colors hover:bg-milsaca-dourado/25"
        >
          {cta.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function EntregasMiniCard({
  label,
  count,
  tone,
  items,
}: {
  label: string;
  count: number;
  tone: "warn" | "info";
  items: {
    id: string;
    contrato_code: string;
    produtor_nome: string;
    data_prevista: string | null;
    bag_count: number | null;
  }[];
}) {
  const isWarn = tone === "warn";
  return (
    <Card
      className={
        isWarn && count > 0
          ? "border-rose-200 bg-rose-50/40"
          : "border-milsaca-cream-escuro"
      }
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-xs uppercase tracking-wider">
          {label}
        </CardDescription>
        <span
          className={
            isWarn && count > 0
              ? "flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-700"
              : "flex h-7 w-7 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde"
          }
        >
          {isWarn ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : (
            <Truck className="h-3.5 w-3.5" />
          )}
        </span>
      </CardHeader>
      <CardContent>
        <p
          className={
            isWarn && count > 0
              ? "text-3xl font-semibold tracking-tight text-rose-700"
              : "text-3xl font-semibold tracking-tight text-milsaca-verde"
          }
        >
          {count}
        </p>
        {items.length === 0 ? (
          <p className="mt-1 text-xs text-milsaca-verde-claro">
            {isWarn ? "Nada em atraso. Bom." : "Nenhuma entrega hoje."}
          </p>
        ) : (
          <ul className="mt-3 space-y-1 text-xs text-milsaca-verde-claro">
            {items.slice(0, 3).map((it) => (
              <li key={it.id}>
                <Link
                  href={`/painel/corretora/entregas/${it.id}`}
                  className="hover:text-milsaca-verde hover:underline"
                >
                  <span className="font-mono">{it.contrato_code}</span> ·{" "}
                  {it.produtor_nome}
                  {it.bag_count ? ` · ${it.bag_count} sc` : ""}
                </Link>
              </li>
            ))}
            {items.length > 3 ? (
              <li className="text-[10px] text-milsaca-verde-claro/70">
                +{items.length - 3} ...
              </li>
            ) : null}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  if (status === "convertido") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
        Convertido
      </Badge>
    );
  }
  if (status === "perdido") {
    return (
      <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">
        Perdido
      </Badge>
    );
  }
  if (status === "arquivado") {
    return (
      <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200">
        Arquivado
      </Badge>
    );
  }
  if (status === "em_negociacao") {
    return (
      <Badge className="bg-milsaca-dourado/25 text-milsaca-cafezal hover:bg-milsaca-dourado/25">
        Em negociação
      </Badge>
    );
  }
  return (
    <Badge className="bg-milsaca-cream-escuro text-milsaca-verde hover:bg-milsaca-cream-escuro">
      Novo
    </Badge>
  );
}
