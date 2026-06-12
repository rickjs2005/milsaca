import { cn } from "@/lib/utils";

/**
 * Primitivo de skeleton — bloco com shimmer (animate-pulse) que casa
 * com fundo cream-claro. Use em loading.tsx pra que o layout não
 * "salte" quando os dados chegam.
 *
 * Diretrizes:
 *   - Match shape: altura e largura próximas do conteúdo real.
 *   - Use rounded-card pra cards / rounded-md pra textos / rounded-pill pra chips.
 *   - Não anime mais de ~10 blocos visíveis simultaneamente (custo de paint).
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-neutral-200/70",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Skeleton de header de página — barra eyebrow + título + descrição.
 * Match com o shape do <PageHeader>.
 */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-8 flex flex-col gap-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-64 sm:h-9" />
      <Skeleton className="h-3 w-full max-w-md" />
    </div>
  );
}

/**
 * Skeleton de KpiCard — grid responsivo. cols controla quantos.
 */
export function KpiGridSkeleton({ cols = 4 }: { cols?: 3 | 4 | 5 }) {
  const colsClass =
    cols === 3
      ? "sm:grid-cols-3"
      : cols === 5
        ? "sm:grid-cols-3 lg:grid-cols-5"
        : "sm:grid-cols-4";
  return (
    <div className={cn("grid grid-cols-2 gap-4", colsClass)}>
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className="rounded-card border border-slate-200 bg-white p-5 shadow-card"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-20" />
          <Skeleton className="mt-2 h-2.5 w-32" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton de tabela admin — N colunas × M linhas. Match com <DataTable>.
 */
export function TableSkeleton({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
      {/* Header (desktop only) */}
      <div
        className="hidden border-b border-slate-100 bg-slate-50/60 px-5 py-3 md:grid"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 w-16" />
        ))}
      </div>
      {/* Desktop rows */}
      <div className="hidden md:block">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="grid items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols }).map((__, j) => (
              <Skeleton key={j} className="h-3" />
            ))}
          </div>
        ))}
      </div>
      {/* Mobile card list */}
      <div className="space-y-3 p-4 md:hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="space-y-2 rounded-md border border-slate-100 p-3"
          >
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-2.5 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
