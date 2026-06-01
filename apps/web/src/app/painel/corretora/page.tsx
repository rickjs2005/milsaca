import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  Coffee,
  Handshake,
  FileSignature,
  Truck,
  Wallet,
  Package,
  Users,
  Building2,
  Coins,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { IndicadoresLive } from "@/components/indicadores-live";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@milsaca/types";
import { getProfile } from "@/lib/auth";
import { listEntregasHojeEAtrasadas } from "./entregas/_lib/queries";
import {
  loadDashboardKpis,
  loadLeadsRecentes,
  loadCotacoesDashboard,
  loadAutomationSuggestions,
  type CotacaoDashboard,
  type DashboardLead,
} from "./_lib/dashboard";
import { getCorretoraSubscriptionInfo } from "./_lib/corretora";
import { isProOrAbove } from "./_lib/plan-gate";
import { AutomationCard } from "./_components/automation-card";
import { coffeeLabel } from "@/lib/coffee";
import { fmtMoney0, fmtInt } from "@/lib/format";

export const metadata = { title: "Início — Painel da corretora" };

const COFFEE_LABEL: Record<string, string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};

function urgencia(updatedAt: string, status: LeadStatus): string {
  const dias = Math.floor(
    (Date.now() - new Date(updatedAt).getTime()) / 86_400_000,
  );
  if (dias <= 0) return status === "novo" ? "recebido hoje" : "atualizado hoje";
  if (status === "novo" || status === "em_negociacao") {
    return `há ${dias} dia${dias === 1 ? "" : "s"} sem contato`;
  }
  return `atualizado há ${dias} dia${dias === 1 ? "" : "s"}`;
}

export default async function InicioCorretoraPage() {
  const profile = await getProfile();
  const corretoraId = profile?.corretora_id ?? "";

  const [kpis, leads, cotacoes, entregasSnap, suggestions, subscription] =
    await Promise.all([
      loadDashboardKpis(corretoraId),
      loadLeadsRecentes(corretoraId),
      loadCotacoesDashboard(corretoraId),
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
    <div className="space-y-section">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 tracking-tight text-milsaca-cafezal">
            Central comercial
          </h1>
          <p className="mt-1 text-body-sm text-neutral-600">
            Seu dinheiro em jogo, o funil e o que precisa de ação hoje.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/painel/corretora/lotes/novo"
            className="inline-flex h-11 items-center gap-1.5 rounded-md border border-milsaca-dourado/40 bg-milsaca-dourado/15 px-4 text-label font-semibold text-milsaca-cafezal transition-colors hover:bg-milsaca-dourado/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Package className="h-4 w-4" />
            Cadastrar lote
          </Link>
          <Link
            href="/painel/corretora/leads/novo"
            className="inline-flex h-11 items-center gap-1.5 rounded-md bg-milsaca-cafezal px-4 text-label font-semibold text-milsaca-cream transition-colors hover:bg-milsaca-folha focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Handshake className="h-4 w-4" />
            Novo lead
          </Link>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* FAIXA 1 — DINHEIRO (o que importa primeiro)                       */}
      {/* ---------------------------------------------------------------- */}
      <section
        aria-label="Dinheiro"
        className="grid grid-cols-2 gap-4 lg:grid-cols-3"
      >
        <MoneyCard
          label="Comissão do mês"
          value={fmtMoney0(kpis.receitaMes)}
          hint="Contratos ativos e finalizados"
          icon={Wallet}
          href="/painel/corretora/contratos"
          premium
          className="col-span-2 lg:col-span-1"
        />
        <MoneyCard
          label="Em negociação"
          value={fmtMoney0(kpis.valorEmNegociacao)}
          hint={`${kpis.emNegociacao} proposta${kpis.emNegociacao === 1 ? "" : "s"} aberta${kpis.emNegociacao === 1 ? "" : "s"}`}
          icon={TrendingUp}
          href="/painel/corretora/leads?status=em_negociacao"
        />
        <MoneyCard
          label="Contratos ativos"
          value={fmtInt(kpis.contratosAtivos)}
          hint="Em execução"
          icon={FileSignature}
          href="/painel/corretora/contratos?status=ativo"
        />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* FUNIL — como a corretora lê o pipeline                            */}
      {/* ---------------------------------------------------------------- */}
      <Funil
        leads={kpis.leadsNovos}
        emNeg={kpis.emNegociacao}
        convertidos={kpis.convertidosMes}
        contratos={kpis.contratosAtivos}
      />

      {/* ---------------------------------------------------------------- */}
      {/* OPERAÇÃO — atalhos secundários, clicáveis                         */}
      {/* ---------------------------------------------------------------- */}
      <section
        aria-label="Operação"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <OpChip
          label="Sacas disponíveis"
          value={fmtInt(kpis.sacasDisponiveis)}
          icon={Coffee}
          href="/painel/corretora/lotes"
        />
        <OpChip
          label="Lotes ativos"
          value={fmtInt(kpis.lotesAtivos)}
          icon={Package}
          href="/painel/corretora/lotes"
        />
        <OpChip
          label="Produtores"
          value={fmtInt(kpis.produtoresCadastrados)}
          icon={Users}
          href="/painel/corretora/produtores"
        />
        <OpChip
          label="Compradores"
          value={fmtInt(kpis.compradoresAtivos)}
          icon={Building2}
          href="/painel/corretora/compradores"
        />
      </section>

      {operationEmpty ? <FirstStepsCard /> : null}

      {isPro ? <AutomationCard suggestions={suggestions} /> : null}

      {/* Entregas pra acompanhar */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-label font-semibold uppercase tracking-wider text-neutral-600">
            <Truck className="h-4 w-4 text-milsaca-cafezal" />
            Entregas pra acompanhar
          </h2>
          <Link
            href="/painel/corretora/entregas"
            className="rounded-sm text-caption font-medium text-milsaca-cafezal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

      {/* Leads recentes — com valor + urgência */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-label font-semibold uppercase tracking-wider text-neutral-600">
            Leads recentes
          </h2>
          <Link
            href="/painel/corretora/leads"
            className="rounded-sm text-caption font-medium text-milsaca-cafezal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
          <Card>
            <CardContent className="divide-y divide-neutral-200 p-0">
              {leads.map((l) => (
                <LeadRow key={l.id} l={l} />
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Cotações da praça */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-label font-semibold uppercase tracking-wider text-neutral-600">
            Cotações da praça
          </h2>
          <Link
            href="/painel/corretora/cotacoes"
            className="rounded-sm text-caption font-medium text-milsaca-cafezal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

      <IndicadoresLive />
    </div>
  );
}

/* ====================================================================== */
/* Subcomponentes                                                         */
/* ====================================================================== */

function MoneyCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  premium,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  href: string;
  premium?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <Card tone={premium ? "premium" : "default"} interactive className="h-full">
        <CardContent className="p-card">
          <div className="flex items-center justify-between">
            <p className="text-caption font-medium uppercase tracking-wider text-neutral-500">
              {label}
            </p>
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-inset",
                premium
                  ? "bg-milsaca-dourado/15 text-milsaca-cafezal ring-milsaca-dourado/40"
                  : "bg-milsaca-cafezal/10 text-milsaca-cafezal ring-transparent",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
          </div>
          <p
            className={cn(
              "mt-3 leading-none text-milsaca-cafezal",
              premium ? "text-display" : "text-h1",
            )}
          >
            {value}
          </p>
          {hint ? (
            <p className="mt-2 text-caption text-neutral-500">{hint}</p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}

function Funil({
  leads,
  emNeg,
  convertidos,
  contratos,
}: {
  leads: number;
  emNeg: number;
  convertidos: number;
  contratos: number;
}) {
  const steps: { label: string; value: number; href: string }[] = [
    { label: "Leads", value: leads, href: "/painel/corretora/leads?status=novo" },
    {
      label: "Negociação",
      value: emNeg,
      href: "/painel/corretora/leads?status=em_negociacao",
    },
    {
      label: "Convertidos",
      value: convertidos,
      href: "/painel/corretora/leads?status=convertido",
    },
    {
      label: "Contratos",
      value: contratos,
      href: "/painel/corretora/contratos?status=ativo",
    },
  ];
  return (
    <Card tone="muted">
      <CardContent className="flex items-stretch gap-1 overflow-x-auto p-3 sm:gap-2">
        {steps.map((s, i) => (
          <div key={s.label} className="flex flex-1 items-center gap-1 sm:gap-2">
            <Link
              href={s.href}
              className="flex flex-1 flex-col items-center rounded-md px-2 py-2 text-center transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-h2 leading-none text-milsaca-cafezal">
                {s.value}
              </span>
              <span className="mt-1 text-caption text-neutral-500">
                {s.label}
              </span>
            </Link>
            {i < steps.length - 1 ? (
              <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function OpChip({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-card border border-neutral-200 bg-white p-3 shadow-card transition-all hover:border-milsaca-dourado/40 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-milsaca-cafezal/10 text-milsaca-cafezal">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-h3 leading-none text-milsaca-cafezal">
          {value}
        </span>
        <span className="mt-0.5 block truncate text-caption text-neutral-500">
          {label}
        </span>
      </span>
    </Link>
  );
}

function LeadRow({ l }: { l: DashboardLead }) {
  return (
    <Link
      href={`/painel/corretora/leads/${l.id}`}
      className="flex items-center justify-between gap-4 px-card py-4 transition-colors hover:bg-milsaca-cream first:rounded-t-card last:rounded-b-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <div className="min-w-0">
        <p className="truncate text-body-sm font-semibold text-milsaca-cafezal">
          {l.produtor}
        </p>
        <p className="mt-0.5 text-caption text-neutral-600">
          {l.bag_count ? `${l.bag_count} sacas` : "—"}
          {l.coffee_type ? ` ${coffeeLabel(l.coffee_type)}` : ""}
          {l.valor != null ? ` · ${fmtMoney0(l.valor)}` : ""}
        </p>
        <p className="mt-0.5 inline-flex items-center gap-1 text-caption text-warning-700">
          <span aria-hidden>⏳</span>
          {urgencia(l.updatedAt, l.status)}
        </p>
      </div>
      <LeadStatusBadge status={l.status} />
    </Link>
  );
}

function FirstStepsCard() {
  return (
    <section className="rounded-card border border-milsaca-dourado/30 bg-gradient-to-br from-milsaca-cream-claro/40 via-white to-white p-6 shadow-card ring-1 ring-inset ring-milsaca-dourado/10 sm:p-8">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-milsaca-dourado/20 text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/40">
          <Coins className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <h2 className="text-h3 text-milsaca-cafezal">
            Sua corretora está pronta. Hora de começar a operar.
          </h2>
          <p className="text-body-sm text-neutral-600">
            Configure o básico abaixo pra começar a receber produtores e
            organizar suas negociações.
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
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
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-card border border-neutral-200 bg-white p-4 transition-all hover:border-milsaca-dourado/50 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-milsaca-dourado/15 text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/30">
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-body-sm font-semibold text-milsaca-preto">{title}</p>
      <p className="text-caption leading-relaxed text-neutral-600">
        {description}
      </p>
      <span className="mt-auto inline-flex items-center gap-1 text-caption font-semibold text-milsaca-cafezal transition-all group-hover:gap-2">
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-milsaca-dourado/15 text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/40">
            <Coffee className="h-4 w-4" />
          </span>
          <CardTitle>{label}</CardTitle>
        </div>
        {cotacao.variacao !== null && (
          <span
            className={
              up
                ? "flex items-center gap-0.5 text-body-sm font-medium text-success-700"
                : "flex items-center gap-0.5 text-body-sm font-medium text-danger-700"
            }
          >
            <Arrow className="h-4 w-4" />
            {up ? "+" : ""}
            {cotacao.variacao.toFixed(1)}%
          </span>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-h2 tracking-tight text-milsaca-cafezal">
          {fmtMoney0(cotacao.price)}
        </p>
        <p className="mt-1 text-caption text-neutral-500">
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
    <div className="rounded-card border border-dashed border-neutral-300 bg-milsaca-cream/40 px-6 py-10 text-center">
      <p className="text-body-sm font-medium text-milsaca-preto">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-caption leading-relaxed text-neutral-600">
        {description}
      </p>
      {cta ? (
        <Link
          href={cta.href}
          className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-md border border-milsaca-dourado/40 bg-milsaca-dourado/15 px-4 text-label font-semibold text-milsaca-cafezal transition-colors hover:bg-milsaca-dourado/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
  const alert = isWarn && count > 0;
  return (
    <Card className={alert ? "border-danger-100 bg-danger-50/50" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-caption uppercase tracking-wider text-neutral-600">
          {label}
        </CardDescription>
        <span
          className={
            alert
              ? "flex h-7 w-7 items-center justify-center rounded-full bg-danger-100 text-danger-700"
              : "flex h-7 w-7 items-center justify-center rounded-full bg-info-50 text-info-700"
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
            alert
              ? "text-h2 tracking-tight text-danger-700"
              : "text-h2 tracking-tight text-milsaca-cafezal"
          }
        >
          {count}
        </p>
        {items.length === 0 ? (
          <p className="mt-1 text-caption text-neutral-500">
            {isWarn ? "Nada em atraso. Bom." : "Nenhuma entrega hoje."}
          </p>
        ) : (
          <ul className="mt-3 space-y-1 text-caption text-neutral-600">
            {items.slice(0, 3).map((it) => (
              <li key={it.id}>
                <Link
                  href={`/painel/corretora/entregas/${it.id}`}
                  className="rounded-sm hover:text-milsaca-cafezal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="font-mono">{it.contrato_code}</span> ·{" "}
                  {it.produtor_nome}
                  {it.bag_count ? ` · ${it.bag_count} sc` : ""}
                </Link>
              </li>
            ))}
            {items.length > 3 ? (
              <li className="text-caption text-neutral-400">
                +{items.length - 3} ...
              </li>
            ) : null}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function LeadStatusBadge({ status }: { status: LeadStatus }) {
  if (status === "convertido") {
    return <StatusBadge tone="success">Convertido</StatusBadge>;
  }
  if (status === "perdido") {
    return <StatusBadge tone="danger">Perdido</StatusBadge>;
  }
  if (status === "arquivado") {
    return <StatusBadge tone="neutral">Arquivado</StatusBadge>;
  }
  if (status === "em_negociacao") {
    return <StatusBadge tone="premium">Em negociação</StatusBadge>;
  }
  return <StatusBadge tone="info">Novo</StatusBadge>;
}
