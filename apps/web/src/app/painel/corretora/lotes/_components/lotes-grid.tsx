"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Package, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/pagination";
import { EmptyState as SharedEmptyState } from "@/components/empty-state";
import {
  LOTE_STATUS_LABEL,
  LOTE_STATUS_ORDER,
  SPECIE_LABEL,
  type LoteRow,
  type LoteStatus,
} from "../_lib/lote-meta";
import { LoteCard } from "./lote-card";

type Specie = "arabica" | "conillon";

const STATUS_FILTERS: { value: "" | LoteStatus; label: string }[] = [
  { value: "", label: "Todos" },
  ...LOTE_STATUS_ORDER.filter((s) => s !== "rascunho").map((s) => ({
    value: s,
    label: LOTE_STATUS_LABEL[s],
  })),
];

const SPECIE_FILTERS: { value: "" | Specie; label: string }[] = [
  { value: "", label: "Qualquer café" },
  { value: "arabica", label: SPECIE_LABEL.arabica },
  { value: "conillon", label: SPECIE_LABEL.conillon },
];

export function LotesGrid({
  lotes,
  corretoraName,
  cotacoesBySpecie,
  current,
  page,
  totalPages,
}: {
  lotes: LoteRow[];
  corretoraName: string;
  cotacoesBySpecie: Record<Specie, number | null>;
  current: { status?: LoteStatus; specie?: Specie; safra?: string };
  page: number;
  totalPages: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState("");

  // Lista única de safras pra montar filtro pill — derivada dos lotes carregados.
  const safras = useMemo(() => {
    const set = new Set<string>();
    for (const l of lotes) {
      if (l.safra) set.add(l.safra);
    }
    return Array.from(set).sort().reverse();
  }, [lotes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lotes.filter((l) => {
      if (current.safra && l.safra !== current.safra) return false;
      if (!q) return true;
      const haystack = [
        l.codigo,
        l.produtor_nome,
        l.fazenda ?? "",
        l.city ?? "",
        l.state ?? "",
        l.safra ?? "",
        l.ultimo_tipo ?? "",
        SPECIE_LABEL[l.specie],
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [lotes, query, current.safra]);

  function buildHref(key: "status" | "specie" | "safra", value: string): string {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    // Trocar de filtro reseta a paginação.
    next.delete("page");
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function pageHref(p: number): string {
    const next = new URLSearchParams(params.toString());
    if (p > 1) next.set("page", String(p));
    else next.delete("page");
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const hasUrlFilter =
    Boolean(current.status) ||
    Boolean(current.specie) ||
    Boolean(current.safra);
  const hasQuery = query.length > 0;
  const hasAnyFilter = hasUrlFilter || hasQuery;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por código, produtor, fazenda, cidade..."
              className="h-10 w-full rounded-md border border-neutral-200 bg-white pl-9 pr-3 text-body-sm text-milsaca-preto placeholder:text-neutral-400 outline-none transition-colors focus-visible:border-milsaca-dourado focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <div className="flex items-center gap-3 text-caption text-neutral-500">
            <span>
              <strong className="text-milsaca-verde">{filtered.length}</strong>{" "}
              {filtered.length === 1 ? "lote" : "lotes"}
            </span>
            {hasQuery ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="inline-flex items-center gap-1 font-medium text-milsaca-cafezal hover:underline"
              >
                <X className="h-3 w-3" />
                limpar busca
              </button>
            ) : null}
            {hasUrlFilter ? (
              <Link
                href={pathname}
                onClick={() => setQuery("")}
                className="inline-flex items-center gap-1 font-medium text-milsaca-cafezal hover:underline"
              >
                <X className="h-3 w-3" />
                limpar filtros
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
            Status
          </span>
          {STATUS_FILTERS.map((f) => {
            const active = (current.status ?? "") === f.value;
            return (
              <Link
                key={`status-${f.value || "all"}`}
                href={buildHref("status", f.value)}
                className={cn(
                  "rounded-pill px-3 py-1 text-caption font-medium transition-colors",
                  active
                    ? "bg-milsaca-cafezal text-milsaca-cream"
                    : "border border-neutral-200 text-neutral-600 hover:border-milsaca-dourado/50 hover:text-milsaca-cafezal",
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
            Café
          </span>
          {SPECIE_FILTERS.map((f) => {
            const active = (current.specie ?? "") === f.value;
            return (
              <Link
                key={`specie-${f.value || "all"}`}
                href={buildHref("specie", f.value)}
                className={cn(
                  "rounded-pill px-3 py-1 text-caption font-medium transition-colors",
                  active
                    ? "bg-milsaca-cafezal text-milsaca-cream"
                    : "border border-neutral-200 text-neutral-600 hover:border-milsaca-dourado/50 hover:text-milsaca-cafezal",
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        {safras.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
              Safra
            </span>
            <Link
              href={buildHref("safra", "")}
              className={cn(
                "rounded-pill px-3 py-1 text-caption font-medium transition-colors",
                !current.safra
                  ? "bg-milsaca-cafezal text-milsaca-cream"
                  : "border border-neutral-200 text-neutral-600 hover:border-milsaca-dourado/50 hover:text-milsaca-cafezal",
              )}
            >
              Todas
            </Link>
            {safras.map((s) => (
              <Link
                key={`safra-${s}`}
                href={buildHref("safra", s)}
                className={cn(
                  "rounded-pill px-3 py-1 text-caption font-medium transition-colors",
                  current.safra === s
                    ? "bg-milsaca-cafezal text-milsaca-cream"
                    : "border border-neutral-200 text-neutral-600 hover:border-milsaca-dourado/50 hover:text-milsaca-cafezal",
                )}
              >
                {s}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasFilter={hasAnyFilter} />
      ) : (
        <div className="grid gap-4">
          {filtered.map((lote) => (
            <LoteCard
              key={lote.id}
              lote={lote}
              corretoraName={corretoraName}
              cotacaoRef={cotacoesBySpecie[lote.specie]}
            />
          ))}
        </div>
      )}

      {/* Paginação server-side. Busca e safra filtram só a página atual. */}
      {totalPages > 1 ? (
        <div className="border-t border-neutral-200 pt-4">
          <Pagination page={page} totalPages={totalPages} hrefFor={pageHref} />
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="rounded-card border border-dashed border-neutral-200 bg-milsaca-cream/40">
      <SharedEmptyState
        icon={Package}
        title={hasFilter ? "Nenhum lote com esse filtro" : "Sua vitrine está vazia"}
        description={
          hasFilter
            ? "Tente afrouxar os filtros ou cadastre um novo lote."
            : "Cadastre o primeiro lote de café pra começar a oferecer aos compradores."
        }
        cta={{ label: "Cadastrar lote", href: "/painel/corretora/lotes/novo" }}
      />
    </div>
  );
}
