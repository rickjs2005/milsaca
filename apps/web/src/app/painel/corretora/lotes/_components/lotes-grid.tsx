"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Package, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
}: {
  lotes: LoteRow[];
  corretoraName: string;
  cotacoesBySpecie: Record<Specie, number | null>;
  current: { status?: LoteStatus; specie?: Specie; safra?: string };
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
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-milsaca-verde-claro/60" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por código, produtor, fazenda, cidade..."
              className="h-9 w-full rounded-md border border-milsaca-cream-escuro bg-white pl-9 pr-3 text-sm text-milsaca-verde placeholder:text-milsaca-verde-claro/50 outline-none transition-colors focus:border-milsaca-dourado/60 focus:ring-2 focus:ring-milsaca-dourado/20"
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-milsaca-verde-claro">
            <span>
              <strong className="text-milsaca-verde">{filtered.length}</strong>{" "}
              {filtered.length === 1 ? "lote" : "lotes"}
            </span>
            {hasQuery ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="inline-flex items-center gap-1 text-milsaca-cafezal hover:underline"
              >
                <X className="h-3 w-3" />
                limpar busca
              </button>
            ) : null}
            {hasUrlFilter ? (
              <Link
                href={pathname}
                onClick={() => setQuery("")}
                className="inline-flex items-center gap-1 text-milsaca-cafezal hover:underline"
              >
                <X className="h-3 w-3" />
                limpar filtros
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-milsaca-verde-claro/70">
            Status
          </span>
          {STATUS_FILTERS.map((f) => {
            const active = (current.status ?? "") === f.value;
            return (
              <Link
                key={`status-${f.value || "all"}`}
                href={buildHref("status", f.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-milsaca-verde text-milsaca-cream"
                    : "border border-milsaca-cream-escuro text-milsaca-verde-claro hover:text-milsaca-verde",
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-milsaca-verde-claro/70">
            Café
          </span>
          {SPECIE_FILTERS.map((f) => {
            const active = (current.specie ?? "") === f.value;
            return (
              <Link
                key={`specie-${f.value || "all"}`}
                href={buildHref("specie", f.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-milsaca-cafezal text-milsaca-cream"
                    : "border border-milsaca-cream-escuro text-milsaca-verde-claro hover:text-milsaca-verde",
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        {safras.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-milsaca-verde-claro/70">
              Safra
            </span>
            <Link
              href={buildHref("safra", "")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                !current.safra
                  ? "bg-milsaca-verde text-milsaca-cream"
                  : "border border-milsaca-cream-escuro text-milsaca-verde-claro hover:text-milsaca-verde",
              )}
            >
              Todas
            </Link>
            {safras.map((s) => (
              <Link
                key={`safra-${s}`}
                href={buildHref("safra", s)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  current.safra === s
                    ? "bg-milsaca-verde text-milsaca-cream"
                    : "border border-milsaca-cream-escuro text-milsaca-verde-claro hover:text-milsaca-verde",
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
    </div>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="rounded-card border border-dashed border-milsaca-cream-escuro bg-white/40 px-6 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
        <Package className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-milsaca-verde">
        {hasFilter ? "Nenhum lote com esse filtro." : "Sua vitrine está vazia."}
      </p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-milsaca-verde-claro">
        {hasFilter
          ? "Tente afrouxar os filtros ou cadastre um novo lote."
          : "Cadastre o primeiro lote de café pra começar a oferecer aos compradores."}
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <Link
          href="/painel/corretora/lotes/novo"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-milsaca-cafezal px-3 text-xs font-semibold text-milsaca-cream transition-colors hover:bg-milsaca-folha"
        >
          Cadastrar lote
        </Link>
      </div>
    </div>
  );
}
