"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterOption = {
  /** Valor que vai pra URL. Vazio "" representa "Todos". */
  value: string;
  label: string;
  /** Contador opcional renderizado depois do label. */
  count?: number;
};

export type FilterDef = {
  /** Nome do query param na URL. */
  param: string;
  label: string;
  options: FilterOption[];
};

type Props = {
  /** Param de busca textual. Padrão: "q". Omitir = sem busca. */
  searchParam?: string;
  searchPlaceholder?: string;
  filters?: FilterDef[];
  /** Texto ao lado dos filtros — ex.: "12 resultados". */
  resultsLabel?: string;
  className?: string;
};

/**
 * Filtros pra listas server-rendered. Lê/escreve em URLSearchParams,
 * então o estado vive na URL (compartilhável, bookmark-friendly).
 *
 * Busca: debounce 350ms.
 * Chips: clicáveis, toggle, "Todos" sempre primeiro (value="").
 *
 * Roda em useTransition pra navegação suave sem bloquear input.
 */
export function FilterBar({
  searchParam = "q",
  searchPlaceholder = "Buscar...",
  filters,
  resultsLabel,
  className,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(sp.get(searchParam) ?? "");

  // Sincroniza quando URL muda externamente
  useEffect(() => {
    setSearch(sp.get(searchParam) ?? "");
  }, [sp, searchParam]);

  // Debounce na busca
  useEffect(() => {
    const current = sp.get(searchParam) ?? "";
    if (search === current) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(sp.toString());
      if (search.trim()) next.set(searchParam, search.trim());
      else next.delete(searchParam);
      next.delete("page"); // reset paginação ao buscar
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    }, 350);
    return () => clearTimeout(t);
  }, [search, sp, pathname, router, searchParam]);

  function setFilter(param: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(param, value);
    else next.delete(param);
    next.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  function clearAll() {
    const next = new URLSearchParams();
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
    setSearch("");
    void next;
  }

  const hasAnyFilter =
    Boolean(search) ||
    (filters ?? []).some((f) => (sp.get(f.param) ?? "") !== "");

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-card border border-slate-200 bg-white p-4 shadow-card",
        className,
      )}
    >
      {searchParam ? (
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-md border border-slate-200 bg-white pl-9 pr-9 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
          />
          {search ? (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}

      {filters && filters.length > 0 ? (
        <div className="flex flex-col gap-2">
          {filters.map((f) => {
            const current = sp.get(f.param) ?? "";
            return (
              <div key={f.param} className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  {f.label}
                </span>
                {f.options.map((o) => {
                  const active = current === o.value;
                  return (
                    <button
                      key={o.value || "__all__"}
                      type="button"
                      onClick={() => setFilter(f.param, o.value)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-medium transition-colors",
                        active
                          ? "bg-milsaca-cafezal text-milsaca-cream"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                      )}
                    >
                      {o.label}
                      {o.count != null ? (
                        <span
                          className={cn(
                            "ml-0.5 rounded-pill px-1.5 text-[10px]",
                            active
                              ? "bg-milsaca-cream/20 text-milsaca-cream"
                              : "bg-white text-slate-500",
                          )}
                        >
                          {o.count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : null}

      {resultsLabel || hasAnyFilter ? (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{resultsLabel}</span>
          {hasAnyFilter ? (
            <button
              type="button"
              onClick={clearAll}
              className="font-medium text-milsaca-cafezal hover:underline underline-offset-4"
            >
              Limpar filtros
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
