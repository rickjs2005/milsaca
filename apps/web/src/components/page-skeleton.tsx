import { Skeleton, TableSkeleton } from "@/components/skeleton";
import { cn } from "@/lib/utils";

/**
 * Skeletons de página inteira pros loading.tsx do painel (corretora e
 * produtor). Três variantes que cobrem os layouts recorrentes do kit:
 *
 *   - <DashboardSkeleton /> — faixa de comando (KPIs densos) + fila de
 *     triagem + grade de trabalho 2/3 + 1/3. Match com /painel/corretora
 *     e /painel/produtor.
 *   - <ListaSkeleton /> — header (título + ações) + KPIs + grade de cards.
 *     Match com leads, contratos, lotes, laudos, negociações, financeiro.
 *   - <FeedSkeleton /> — header + composer + abas + posts. Match com a
 *     Comunidade (coluna central max-w-2xl).
 *
 * Diretriz do kit: tokens neutral-* (nunca slate/gray cru), rounded-card,
 * shadow-card, espaçamento space-y-6/8 igual às páginas reais — assim o
 * conteúdo não "salta" quando os dados chegam.
 */

/** Casca de card — mesma moldura dos cards reais do painel. */
function CardShell({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-card border border-neutral-200 bg-white p-5 shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Bloco de KPI — label + valor + hint, shape do <KpiCard>. */
function KpiBlock() {
  return (
    <CardShell>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-20" />
      <Skeleton className="mt-2 h-2.5 w-28" />
    </CardShell>
  );
}

/** Header de página de lista — título + descrição + botão de ação. */
function ListHeader() {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-3.5 w-72 max-w-full" />
      </div>
      <Skeleton className="h-10 w-32 rounded-md" />
    </header>
  );
}

/* ====================================================================== */
/* Variante: dashboard                                                    */
/* ====================================================================== */

export function DashboardSkeleton() {
  return (
    <div aria-busy className="space-y-6">
      {/* Faixa de comando — KPIs do mês em linha densa */}
      <CardShell className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-2.5 h-6 w-24" />
          </div>
        ))}
      </CardShell>

      {/* Triagem — fila de trabalho */}
      <CardShell className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-48" />
          <Skeleton className="h-2.5 w-72 max-w-full" />
        </div>
        <Skeleton className="hidden h-9 w-28 rounded-md sm:block" />
      </CardShell>

      {/* Zona de trabalho — coluna larga + coluna estreita */}
      <div className="grid gap-6 xl:grid-cols-3">
        <CardShell className="xl:col-span-2">
          <Skeleton className="h-3 w-32" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-40 max-w-full" />
                  <Skeleton className="h-2.5 w-56 max-w-full" />
                </div>
                <Skeleton className="h-5 w-20 rounded-pill" />
              </div>
            ))}
          </div>
        </CardShell>
        <div className="space-y-6">
          <CardShell>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-4 h-7 w-24" />
            <Skeleton className="mt-2 h-2.5 w-36" />
          </CardShell>
          <CardShell>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-4 h-7 w-24" />
            <Skeleton className="mt-2 h-2.5 w-36" />
          </CardShell>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================== */
/* Variante: lista                                                        */
/* ====================================================================== */

export function ListaSkeleton({ kpis = 3 }: { kpis?: 3 | 4 | 5 }) {
  const kpiCols =
    kpis === 5
      ? "lg:grid-cols-3 xl:grid-cols-5"
      : kpis === 4
        ? "sm:grid-cols-4"
        : "sm:grid-cols-3";
  return (
    <div aria-busy className="space-y-8">
      <ListHeader />

      {/* KPIs */}
      <div className={cn("grid grid-cols-2 gap-4", kpiCols)}>
        {Array.from({ length: kpis }).map((_, i) => (
          <KpiBlock key={i} />
        ))}
      </div>

      {/* Grade de cards (linhas da lista) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardShell key={i}>
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-5 w-16 rounded-pill" />
            </div>
            <Skeleton className="mt-3 h-2.5 w-40 max-w-full" />
            <Skeleton className="mt-2 h-2.5 w-28" />
          </CardShell>
        ))}
      </div>
    </div>
  );
}

/* ====================================================================== */
/* Variante: feed (Comunidade)                                            */
/* ====================================================================== */

export function FeedSkeleton() {
  return (
    <div aria-busy className="mx-auto max-w-2xl space-y-6">
      <ListHeader />

      {/* Composer — avatar + campo + ações de mídia */}
      <CardShell>
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <Skeleton className="h-10 flex-1 rounded-md" />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="ml-auto h-9 w-24 rounded-md" />
        </div>
      </CardShell>

      {/* Abas Todos | Seguindo */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-pill" />
        <Skeleton className="h-8 w-24 rounded-pill" />
      </div>

      {/* Posts */}
      {Array.from({ length: 3 }).map((_, i) => (
        <CardShell key={i}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          {i === 0 ? (
            <Skeleton className="mt-4 h-48 w-full rounded-card" />
          ) : null}
          <div className="mt-4 flex gap-6">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-20" />
          </div>
        </CardShell>
      ))}
    </div>
  );
}

/* ====================================================================== */
/* Variante: tabela (header simples + tabela)                             */
/* ====================================================================== */

/**
 * Header (título + descrição, sem botão) + <TableSkeleton>. Match com
 * páginas de tabela como Contratos e Extrato do produtor.
 */
export function TabelaSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div aria-busy className="space-y-6">
      <header className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-3.5 w-72 max-w-full" />
      </header>
      <TableSkeleton rows={6} cols={cols} />
    </div>
  );
}

/* ====================================================================== */
/* Variante: cotações do produtor                                         */
/* ====================================================================== */

/** Card de cotação — nome + preço grande + delta + sparkline. */
function CotacaoCardSkeleton() {
  return (
    <CardShell>
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-5 w-14 rounded-pill" />
      </div>
      <Skeleton className="mt-3 h-7 w-28" />
      <Skeleton className="mt-4 h-10 w-full rounded-md" />
      <Skeleton className="mt-3 h-2.5 w-28" />
    </CardShell>
  );
}

/**
 * Cotações do produtor — filtros + banner de insight + "melhor preço hoje"
 * + grade de corretoras + mercado nacional/internacional. Match com
 * /painel/produtor/cotacoes pra que nada salte quando os dados chegam.
 */
export function CotacoesSkeleton() {
  return (
    <div aria-busy className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </header>

      {/* Filtros: tipo de café + região */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        ))}
      </div>

      {/* Banner de insight */}
      <CardShell className="flex items-center gap-3">
        <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-2.5 w-64 max-w-full" />
        </div>
      </CardShell>

      {/* Melhor preço hoje — destaque */}
      <CardShell>
        <Skeleton className="h-2.5 w-32" />
        <Skeleton className="mt-2 h-9 w-48" />
        <Skeleton className="mt-2 h-3 w-56 max-w-full" />
      </CardShell>

      {/* Minhas corretoras */}
      <section className="space-y-3">
        <Skeleton className="h-3.5 w-40" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CotacaoCardSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Mercado nacional + internacional */}
      {Array.from({ length: 2 }).map((_, s) => (
        <section key={s} className="space-y-3">
          <Skeleton className="h-3.5 w-44" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <CotacaoCardSkeleton key={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ====================================================================== */
/* Variante: agenda comercial (corretora)                                 */
/* ====================================================================== */

/** Card de balde — linhas com ícone + 2 textos + chip de data à direita. */
function AgendaBaldeSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-6 rounded-pill" />
      </div>
      <div
        aria-hidden
        className="divide-y divide-neutral-200 rounded-card border border-neutral-200 bg-white shadow-card"
      >
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-card py-3.5">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-44 max-w-full" />
              <Skeleton className="h-2.5 w-32 max-w-full" />
            </div>
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Agenda comercial da corretora — header + baldes Hoje/Amanhã/Esta semana,
 * cada um com linhas de entrega/repasse. Match com /painel/corretora/agenda.
 */
export function AgendaSkeleton() {
  return (
    <div aria-busy className="space-y-section">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="h-8 w-56" />
        </div>
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </header>
      <div className="space-y-section">
        <AgendaBaldeSkeleton rows={2} />
        <AgendaBaldeSkeleton rows={3} />
        <AgendaBaldeSkeleton rows={2} />
      </div>
    </div>
  );
}

/* ====================================================================== */
/* Variante: catálogo de corretoras (produtor)                            */
/* ====================================================================== */

/**
 * Catálogo de corretoras — filtros em pílulas + grade de cards. Match com
 * /painel/produtor/corretoras.
 */
export function CatalogoSkeleton() {
  return (
    <div aria-busy className="space-y-6">
      <header className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-3.5 w-96 max-w-full" />
      </header>

      {/* Filtros em pílulas (mostrar + região) */}
      {Array.from({ length: 2 }).map((_, row) => (
        <div key={row} className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-16" />
          {Array.from({ length: row === 0 ? 3 : 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-pill" />
          ))}
        </div>
      ))}

      {/* Grade de cards de corretora */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardShell key={i}>
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-5 w-5 rounded-md" />
            </div>
            <Skeleton className="mt-2 h-2.5 w-40 max-w-full" />
            <Skeleton className="mt-3 h-14 w-full rounded-md" />
            <div className="mt-3 flex flex-wrap gap-1">
              <Skeleton className="h-5 w-20 rounded-pill" />
              <Skeleton className="h-5 w-24 rounded-pill" />
            </div>
            <div className="mt-3 flex gap-2">
              <Skeleton className="h-9 w-28 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </CardShell>
        ))}
      </div>
    </div>
  );
}
