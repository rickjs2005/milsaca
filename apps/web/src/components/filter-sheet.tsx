"use client";

import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

export type FilterGroup = {
  key: string;
  label: string;
  /** Opções; value "" normalmente = "todos/qualquer". */
  options: FilterOption[];
  /** Valor selecionado atual ("" = nenhum/qualquer). */
  value: string;
  /** Chamado ao tocar uma opção. O pai decide (URL nav ou setState). */
  onSelect: (value: string) => void;
};

/**
 * Bottom-sheet de filtros — genérico e CONTROLADO (o pai dona o estado).
 * Mobile-only (`sm:hidden`). Reutilizável em Leads, Lotes, Contratos, etc.
 * Cada grupo é single-select por pills; o rodapé "Ver N" fecha.
 */
export function FilterSheet({
  open,
  onClose,
  groups,
  resultCount,
  resultNoun = "itens",
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  groups: FilterGroup[];
  resultCount: number;
  resultNoun?: string;
  onClear?: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <button
        type="button"
        aria-label="Fechar filtros"
        onClick={onClose}
        className="absolute inset-0 bg-milsaca-cafezal/50 backdrop-blur-sm"
      />
      <div
        className="absolute inset-x-0 bottom-0 max-h-[85vh] space-y-4 overflow-y-auto rounded-t-2xl bg-white p-4"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-neutral-300" />
        <div className="flex items-center justify-between">
          <h2 className="text-h3 text-milsaca-cafezal">Filtros</h2>
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-caption font-medium text-milsaca-cafezal hover:underline"
            >
              Limpar
            </button>
          ) : null}
        </div>

        {groups.map((g) => (
          <div key={g.key} className="space-y-2">
            <p className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
              {g.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {g.options.map((o) => {
                const active = g.value === o.value;
                return (
                  <button
                    key={`${g.key}-${o.value || "all"}`}
                    type="button"
                    onClick={() => g.onSelect(o.value)}
                    className={cn(
                      "rounded-pill px-3 py-1.5 text-caption font-medium transition-colors",
                      active
                        ? "bg-milsaca-cafezal text-milsaca-cream"
                        : "border border-neutral-200 text-neutral-600",
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={onClose}
          className="h-11 w-full rounded-md bg-milsaca-cafezal text-label font-semibold text-milsaca-cream transition-colors hover:bg-milsaca-folha"
        >
          Ver {resultCount} {resultNoun}
        </button>
      </div>
    </div>
  );
}
