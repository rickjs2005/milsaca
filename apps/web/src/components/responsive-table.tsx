import { cn } from "@/lib/utils";

export type ResponsiveColumn = {
  key: string;
  label: React.ReactNode;
  align?: "left" | "right" | "center";
  /** Classes extras no <th> (largura, esconder em breakpoint, etc.). */
  className?: string;
};

const ALIGN: Record<NonNullable<ResponsiveColumn["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

/**
 * Tabela responsiva canônica do painel: vira `<table>` no desktop
 * (`hidden lg:block`) e grade de cards no mobile/tablet (`lg:hidden`).
 *
 * Substitui o padrão `overflow-x-auto` (que cortava colunas no mobile)
 * repetido em todas as telas-lista. Cada tela fornece só o conteúdo:
 * `renderRow` devolve os `<td>` de uma linha; `renderCard` devolve o card.
 *
 * Mantém o chrome visual idêntico ao das telas já consolidadas
 * (Pagamentos/Entregas/Cotações), então adotar numa tela é trocar a marcação
 * inline por este componente, sem mudança visual.
 */
export function ResponsiveTable<T>({
  columns,
  rows,
  keyFor,
  renderRow,
  renderCard,
  rowClassName,
  cardGridClassName = "grid grid-cols-1 gap-3 sm:grid-cols-2",
}: {
  columns: ResponsiveColumn[];
  rows: T[];
  keyFor: (row: T, index: number) => string;
  /** Células `<td>` de uma linha (desktop). */
  renderRow: (row: T) => React.ReactNode;
  /** Card de uma linha (mobile/tablet). */
  renderCard: (row: T) => React.ReactNode;
  /** Classe opcional por `<tr>` (ex.: destacar a linha vigente). */
  rowClassName?: (row: T) => string | undefined;
  /** Sobrescreve a grade dos cards (default 1col → 2col em sm). */
  cardGridClassName?: string;
}) {
  return (
    <>
      {/* DESKTOP */}
      <div className="hidden rounded-card border border-neutral-200 bg-white shadow-card lg:block">
        <table className="w-full text-body-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-caption font-medium uppercase tracking-wider text-neutral-600">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-5 py-3 font-medium",
                    ALIGN[c.align ?? "left"],
                    c.className,
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {rows.map((r, i) => (
              <tr
                key={keyFor(r, i)}
                className={cn(
                  "transition-colors hover:bg-neutral-50",
                  rowClassName?.(r),
                )}
              >
                {renderRow(r)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE / TABLET */}
      <div className={cn(cardGridClassName, "lg:hidden")}>
        {rows.map((r, i) => (
          <div key={keyFor(r, i)}>{renderCard(r)}</div>
        ))}
      </div>
    </>
  );
}
