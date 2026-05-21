import { cn } from "@/lib/utils";

export type Column<T> = {
  /** Identificador único da coluna (usado em key). */
  key: string;
  /** Texto no cabeçalho. */
  header: React.ReactNode;
  /** Renderiza o conteúdo da célula. Recebe a row inteira. */
  cell: (row: T, index: number) => React.ReactNode;
  /** Texto curto pra usar como rótulo no layout mobile (cards). */
  mobileLabel?: string;
  /** Esconde essa coluna no mobile (default: false). */
  hideOnMobile?: boolean;
  /** Alinhamento padrão (left). */
  align?: "left" | "right" | "center";
  /** className extra na célula. */
  className?: string;
  /** className extra no header. */
  headerClassName?: string;
};

type Props<T> = {
  columns: Column<T>[];
  data: T[];
  /** Função pra extrair key estável de cada row. */
  rowKey: (row: T, index: number) => string;
  /** href opcional que torna a linha inteira clicável. */
  rowHref?: (row: T) => string | null;
  /** Renderiza quando data.length === 0. */
  empty?: React.ReactNode;
  /** Skeleton de loading (passe N linhas falsas pra simular). */
  loading?: boolean;
  /** Número de linhas no skeleton. Padrão: 5. */
  skeletonRows?: number;
  className?: string;
};

/**
 * Tabela premium para listas admin/painel.
 *
 *   - **Desktop (md+):** <table> tradicional com hover sutil, hairlines.
 *   - **Mobile (<md):** vira lista de cards empilhados (label/valor).
 *
 * Para clique de linha inteiro: passe `rowHref(row)`. Botões dentro
 * da linha continuam clicáveis (event bubbling do <a> não captura
 * cliques em <button>, mas evite aninhar <a> dentro de <a>).
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  rowHref,
  empty,
  loading,
  skeletonRows = 5,
  className,
}: Props<T>) {
  if (loading) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-card border border-slate-200 bg-white shadow-card",
          className,
        )}
      >
        <div
          className="hidden md:block"
          role="status"
          aria-label="Carregando lista"
        >
          <div className="grid border-b border-slate-100 bg-slate-50/60 px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
          >
            {columns.map((c) => (
              <div key={c.key}>{c.header}</div>
            ))}
          </div>
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <div
              key={i}
              className="grid items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
              style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
            >
              {columns.map((c) => (
                <div
                  key={c.key}
                  className="h-3 animate-pulse rounded bg-slate-100"
                />
              ))}
            </div>
          ))}
        </div>
        <div className="space-y-3 p-4 md:hidden">
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <div
              key={i}
              className="space-y-2 rounded-md border border-slate-100 p-3"
            >
              <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "rounded-card border border-slate-200 bg-white shadow-card",
          className,
        )}
      >
        {empty}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-card border border-slate-200 bg-white shadow-card",
        className,
      )}
    >
      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/60 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "px-5 py-3 font-medium",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    c.headerClassName,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const href = rowHref?.(row) ?? null;
              return (
                <tr
                  key={rowKey(row, i)}
                  className={cn(
                    "border-t border-slate-100 transition-colors",
                    href
                      ? "cursor-pointer hover:bg-milsaca-cream/40"
                      : "hover:bg-slate-50/60",
                  )}
                  onClick={
                    href
                      ? (e) => {
                          // Ignora clique se origem é um <a>/<button> interno
                          const t = e.target as HTMLElement;
                          if (t.closest("a,button")) return;
                          window.location.assign(href);
                        }
                      : undefined
                  }
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-5 py-4 text-sm text-slate-700",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                        c.className,
                      )}
                    >
                      {c.cell(row, i)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {data.map((row, i) => {
          const href = rowHref?.(row) ?? null;
          const Wrapper = href ? "a" : "div";
          const wrapperProps = href ? { href } : {};
          return (
            <li key={rowKey(row, i)}>
              <Wrapper
                {...(wrapperProps as Record<string, unknown>)}
                className={cn(
                  "block space-y-2 p-4",
                  href && "transition-colors hover:bg-milsaca-cream/40",
                )}
              >
                {columns
                  .filter((c) => !c.hideOnMobile)
                  .map((c) => (
                    <div
                      key={c.key}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      {c.mobileLabel ? (
                        <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">
                          {c.mobileLabel}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "min-w-0 text-slate-700",
                          c.mobileLabel ? "text-right" : "flex-1",
                          c.className,
                        )}
                      >
                        {c.cell(row, i)}
                      </span>
                    </div>
                  ))}
              </Wrapper>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
