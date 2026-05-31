"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Package, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/pagination";
import { EmptyState as SharedEmptyState } from "@/components/empty-state";
import { FilterSheet, type FilterGroup } from "@/components/filter-sheet";
import {
  LOTE_STATUS_LABEL,
  LOTE_STATUS_ORDER,
  SPECIE_LABEL,
  type LoteRow,
  type LoteStatus,
} from "../_lib/lote-meta";
import { LoteCard } from "./lote-card";

type Specie = "arabica" | "conillon";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  ...LOTE_STATUS_ORDER.filter((s) => s !== "rascunho").map((s) => ({
    value: s,
    label: LOTE_STATUS_LABEL[s],
  })),
];

const SPECIE_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Qualquer café" },
  { value: "arabica", label: SPECIE_LABEL.arabica },
  { value: "conillon", label: SPECIE_LABEL.conillon },
];

type SortKey = "valor" | "recente" | "tipo" | "safra";
const SORT_LABEL: Record<SortKey, string> = {
  valor: "Maior valor",
  recente: "Mais recente",
  tipo: "Por tipo",
  safra: "Por safra",
};

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
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("valor");
  const [sheetOpen, setSheetOpen] = useState(false);

  const totalOf = (l: LoteRow): number => {
    const cot = cotacoesBySpecie[l.specie];
    return cot != null && l.peso_sacas != null ? cot * l.peso_sacas : 0;
  };

  const safras = useMemo(() => {
    const set = new Set<string>();
    for (const l of lotes) if (l.safra) set.add(l.safra);
    return Array.from(set).sort().reverse();
  }, [lotes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = lotes.filter((l) => {
      if (current.safra && l.safra !== current.safra) return false;
      if (!q) return true;
      return [
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
        .toLowerCase()
        .includes(q);
    });
    return [...list].sort((a, b) => {
      switch (sort) {
        case "recente":
          return +new Date(b.created_at) - +new Date(a.created_at);
        case "tipo": {
          const ta = a.ultimo_tipo ? parseInt(a.ultimo_tipo, 10) : 99;
          const tb = b.ultimo_tipo ? parseInt(b.ultimo_tipo, 10) : 99;
          return ta - tb;
        }
        case "safra":
          return (b.safra ?? "").localeCompare(a.safra ?? "");
        default:
          return totalOf(b) - totalOf(a);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotes, query, current.safra, sort, cotacoesBySpecie]);

  function buildHref(key: "status" | "specie" | "safra", value: string): string {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
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

  const activeFilters =
    (current.status ? 1 : 0) +
    (current.specie ? 1 : 0) +
    (current.safra ? 1 : 0);

  const selectClass =
    "h-10 rounded-md border border-neutral-200 bg-white px-3 text-body-sm text-milsaca-cafezal outline-none transition-colors hover:border-milsaca-dourado focus-visible:ring-2 focus-visible:ring-ring/40";

  const sortSelect = (
    <select
      aria-label="Ordenar"
      value={sort}
      onChange={(e) => setSort(e.target.value as SortKey)}
      className={selectClass}
    >
      {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
        <option key={k} value={k}>
          {SORT_LABEL[k]}
        </option>
      ))}
    </select>
  );

  const sheetGroups: FilterGroup[] = [
    {
      key: "status",
      label: "Status",
      options: STATUS_FILTERS,
      value: current.status ?? "",
      onSelect: (v) => router.push(buildHref("status", v)),
    },
    {
      key: "specie",
      label: "Café",
      options: SPECIE_FILTERS,
      value: current.specie ?? "",
      onSelect: (v) => router.push(buildHref("specie", v)),
    },
    ...(safras.length > 0
      ? [
          {
            key: "safra",
            label: "Safra",
            options: [
              { value: "", label: "Todas" },
              ...safras.map((s) => ({ value: s, label: s })),
            ],
            value: current.safra ?? "",
            onSelect: (v: string) => router.push(buildHref("safra", v)),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* Busca + ordenação */}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por código, produtor, fazenda, cidade..."
            className="h-10 w-full rounded-md border border-neutral-200 bg-white pl-9 pr-3 text-body-sm text-milsaca-preto placeholder:text-neutral-400 outline-none transition-colors focus-visible:border-milsaca-dourado focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        {sortSelect}
      </div>

      {/* DESKTOP: pills inline */}
      <div className="hidden space-y-3 sm:block">
        <FilterPills
          label="Status"
          options={STATUS_FILTERS}
          value={current.status ?? ""}
          hrefFor={(v) => buildHref("status", v)}
        />
        <FilterPills
          label="Café"
          options={SPECIE_FILTERS}
          value={current.specie ?? ""}
          hrefFor={(v) => buildHref("specie", v)}
        />
        {safras.length > 0 ? (
          <FilterPills
            label="Safra"
            options={[
              { value: "", label: "Todas" },
              ...safras.map((s) => ({ value: s, label: s })),
            ]}
            value={current.safra ?? ""}
            hrefFor={(v) => buildHref("safra", v)}
          />
        ) : null}
      </div>

      {/* MOBILE: botão Filtros + contagem */}
      <div className="flex items-center justify-between gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex h-10 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 text-body-sm font-medium text-milsaca-cafezal transition-colors hover:border-milsaca-dourado focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeFilters > 0 ? (
            <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-milsaca-cafezal px-1 text-[11px] font-bold text-milsaca-cream">
              {activeFilters}
            </span>
          ) : null}
        </button>
        <span className="text-caption text-neutral-500">
          <strong className="text-milsaca-cafezal">{filtered.length}</strong>{" "}
          {filtered.length === 1 ? "lote" : "lotes"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          hasFilter={activeFilters > 0 || query.length > 0}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

      {totalPages > 1 ? (
        <div className="border-t border-neutral-200 pt-4">
          <Pagination page={page} totalPages={totalPages} hrefFor={pageHref} />
        </div>
      ) : null}

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        groups={sheetGroups}
        resultCount={filtered.length}
        resultNoun={filtered.length === 1 ? "lote" : "lotes"}
        onClear={() => {
          router.push(pathname);
          setSheetOpen(false);
        }}
      />
    </div>
  );
}

function FilterPills({
  label,
  options,
  value,
  hrefFor,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  hrefFor: (value: string) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Link
            key={`${label}-${o.value || "all"}`}
            href={hrefFor(o.value)}
            className={cn(
              "rounded-pill px-3 py-1 text-caption font-medium transition-colors",
              active
                ? "bg-milsaca-cafezal text-milsaca-cream"
                : "border border-neutral-200 text-neutral-600 hover:border-milsaca-dourado/50 hover:text-milsaca-cafezal",
            )}
          >
            {o.label}
          </Link>
        );
      })}
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
