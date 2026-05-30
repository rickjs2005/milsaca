import Link from "next/link";

/**
 * Controle de paginação server-side reutilizável (offset/range).
 *
 * Use em listagens do painel que paginam via `?page=` na query string.
 * Não renderiza nada quando há só 1 página. O chamador monta os hrefs
 * (pra preservar filtros existentes na URL) via `hrefFor(page)`.
 *
 * Visual alinhado aos tokens legacy do painel (milsaca-verde / cream).
 */
export function Pagination({
  page,
  totalPages,
  hrefFor,
  className,
}: {
  page: number;
  totalPages: number;
  /** Monta a URL pra uma página, preservando filtros atuais. */
  hrefFor: (page: number) => string;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Paginação"
      className={
        "flex items-center justify-between gap-3 text-sm text-milsaca-verde-claro" +
        (className ? ` ${className}` : "")
      }
    >
      <span>
        Página <strong className="text-milsaca-verde">{page}</strong> de{" "}
        <strong className="text-milsaca-verde">{totalPages}</strong>
      </span>
      <div className="flex gap-2">
        {hasPrev ? (
          <Link
            href={hrefFor(page - 1)}
            rel="prev"
            className="inline-flex h-9 items-center rounded-md border border-milsaca-cream-escuro px-3 text-xs font-medium text-milsaca-verde transition-colors hover:bg-milsaca-cream-escuro/40"
          >
            ← Anterior
          </Link>
        ) : (
          <span
            aria-disabled
            className="inline-flex h-9 cursor-not-allowed items-center rounded-md border border-milsaca-cream-escuro px-3 text-xs font-medium text-milsaca-verde-claro/40"
          >
            ← Anterior
          </span>
        )}
        {hasNext ? (
          <Link
            href={hrefFor(page + 1)}
            rel="next"
            className="inline-flex h-9 items-center rounded-md border border-milsaca-cream-escuro px-3 text-xs font-medium text-milsaca-verde transition-colors hover:bg-milsaca-cream-escuro/40"
          >
            Próxima →
          </Link>
        ) : (
          <span
            aria-disabled
            className="inline-flex h-9 cursor-not-allowed items-center rounded-md border border-milsaca-cream-escuro px-3 text-xs font-medium text-milsaca-verde-claro/40"
          >
            Próxima →
          </span>
        )}
      </div>
    </nav>
  );
}
