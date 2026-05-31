"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Package, Search, SlidersHorizontal, X } from "lucide-react";
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
type FilterKey = "status" | "specie" | "safra" | "tipo" | "peneira" | "regiao";

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

type SortKey = "valor" | "recente" | "safra";
const SORT_LABEL: Record<SortKey, string> = {
  valor: "Maior valor",
  recente: "Mais recente",
  safra: "Por safra",
};

type Current = {
  status?: LoteStatus;
  specie?: Specie;
  safra?: string;
  tipo?: string;
  peneira?: string;
  regiao?: string;
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
  current: Current;
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

  // Opções derivadas dos lotes carregados.
  const opts = useMemo(() => {
    const safS = new Set<string>();
    const tipS = new Set<string>();
    const penS = new Set<string>();
    const regS = new Set<string>();
    for (const l of lotes) {
      if (l.safra) safS.add(l.safra);
      if (l.ultimo_tipo) tipS.add(l.ultimo_tipo);
      if (l.ultimo_peneira) penS.add(l.ultimo_peneira);
      if (l.city) regS.add(l.city);
    }
    return {
      safras: [...safS].sort().reverse(),
      tipos: [...tipS].sort((a, b) => Number(a) - Number(b)),
      peneiras: [...penS].sort((a, b) => Number(b) - Number(a)),
      regioes: [...regS].sort(),
    };
  }, [lotes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = lotes.filter((l) => {
      if (current.safra && l.safra !== current.safra) return false;
      if (current.tipo && l.ultimo_tipo !== current.tipo) return false;
      if (current.peneira && l.ultimo_peneira !== current.peneira) return false;
      if (current.regiao && l.city !== current.regiao) return false;
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
        case "safra":
          return (b.safra ?? "").localeCompare(a.safra ?? "");
        default:
          return totalOf(b) - totalOf(a);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotes, query, current, sort, cotacoesBySpecie]);

  function buildHref(key: FilterKey, value: string): string {
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

  // Chips de filtros ativos (secundários — status fica nas pills).
  const activeChips: { key: FilterKey; label: string }[] = [];
  if (current.specie)
    activeChips.push({ key: "specie", label: SPECIE_LABEL[current.specie] });
  if (current.safra)
    activeChips.push({ key: "safra", label: `Safra ${current.safra}` });
  if (current.tipo)
    activeChips.push({ key: "tipo", label: `Tipo ${current.tipo}` });
  if (current.peneira)
    activeChips.push({ key: "peneira", label: `Peneira ${current.peneira}` });
  if (current.regiao)
    activeChips.push({ key: "regiao", label: current.regiao });

  const activeFilters = (current.status ? 1 : 0) + activeChips.length;

  const selectClass =
    "h-9 rounded-md border border-neutral-200 bg-white px-2.5 text-caption text-milsaca-cafezal outline-none transition-colors hover:border-milsaca-dourado focus-visible:ring-2 focus-visible:ring-ring/40";

  const sortSelect = (
    <select
      aria-label="Ordenar"
      value={sort}
      onChange={(e) => setSort(e.target.value as SortKey)}
      className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-body-sm text-milsaca-cafezal outline-none transition-colors hover:border-milsaca-dourado focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
        <option key={k} value={k}>
          {SORT_LABEL[k]}
        </option>
      ))}
    </select>
  );

  // Selects "Refinar" (desktop): navegam a URL.
  function RefineSelect({
    fkey,
    placeholder,
    prefix,
    options,
  }: {
    fkey: FilterKey;
    placeholder: string;
    prefix?: string;
    options: string[];
  }) {
    const value = (current[fkey] as string) ?? "";
    return (
      <select
        aria-label={placeholder}
        value={value}
        onChange={(e) => router.push(buildHref(fkey, e.target.value))}
        className={selectClass}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {prefix ? `${prefix} ${o}` : o}
          </option>
        ))}
      </select>
    );
  }

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
    ...(opts.tipos.length
      ? [
          {
            key: "tipo",
            label: "Tipo",
            options: [
              { value: "", label: "Qualquer" },
              ...opts.tipos.map((t) => ({ value: t, label: `Tipo ${t}` })),
            ],
            value: current.tipo ?? "",
            onSelect: (v: string) => router.push(buildHref("tipo", v)),
          },
        ]
      : []),
    ...(opts.peneiras.length
      ? [
          {
            key: "peneira",
            label: "Peneira",
            options: [
              { value: "", label: "Qualquer" },
              ...opts.peneiras.map((p) => ({ value: p, label: `Peneira ${p}` })),
            ],
            value: current.peneira ?? "",
            onSelect: (v: string) => router.push(buildHref("peneira", v)),
          },
        ]
      : []),
    ...(opts.regioes.length
      ? [
          {
            key: "regiao",
            label: "Região",
            options: [
              { value: "", label: "Qualquer" },
              ...opts.regioes.map((r) => ({ value: r, label: r })),
            ],
            value: current.regiao ?? "",
            onSelect: (v: string) => router.push(buildHref("regiao", v)),
          },
        ]
      : []),
    ...(opts.safras.length
      ? [
          {
            key: "safra",
            label: "Safra",
            options: [
              { value: "", label: "Todas" },
              ...opts.safras.map((s) => ({ value: s, label: s })),
            ],
            value: current.safra ?? "",
            onSelect: (v: string) => router.push(buildHref("safra", v)),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-3">
      {/* Linha 1: busca + ordenar */}
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

      {/* Linha 2: STATUS pills (eixo principal) — desktop */}
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        {STATUS_FILTERS.map((f) => {
          const active = (current.status ?? "") === f.value;
          return (
            <Link
              key={`st-${f.value || "all"}`}
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

      {/* Linha 3: "Refinar:" dropdowns — desktop */}
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        <span className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
          Refinar:
        </span>
        <select
          aria-label="Café"
          value={current.specie ?? ""}
          onChange={(e) => router.push(buildHref("specie", e.target.value))}
          className={selectClass}
        >
          {SPECIE_FILTERS.map((f) => (
            <option key={f.value || "any"} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        {opts.tipos.length ? (
          <RefineSelect fkey="tipo" placeholder="Tipo" prefix="Tipo" options={opts.tipos} />
        ) : null}
        {opts.peneiras.length ? (
          <RefineSelect fkey="peneira" placeholder="Peneira" prefix="Peneira" options={opts.peneiras} />
        ) : null}
        {opts.regioes.length ? (
          <RefineSelect fkey="regiao" placeholder="Região" options={opts.regioes} />
        ) : null}
        {opts.safras.length ? (
          <RefineSelect fkey="safra" placeholder="Safra" options={opts.safras} />
        ) : null}
        <span className="ml-auto whitespace-nowrap text-caption text-neutral-500">
          <strong className="text-milsaca-cafezal">{filtered.length}</strong>{" "}
          {filtered.length === 1 ? "lote" : "lotes"}
        </span>
      </div>

      {/* Linha 4: chips de filtros ativos (secundários) — desktop */}
      {activeChips.length > 0 ? (
        <div className="hidden flex-wrap items-center gap-2 sm:flex">
          {activeChips.map((c) => (
            <Link
              key={`chip-${c.key}`}
              href={buildHref(c.key, "")}
              className="inline-flex items-center gap-1 rounded-pill bg-milsaca-cafezal/10 px-2.5 py-0.5 text-caption font-medium text-milsaca-cafezal hover:bg-milsaca-cafezal/20"
            >
              {c.label}
              <X className="h-3 w-3" />
            </Link>
          ))}
          <Link
            href={pathname}
            className="text-caption font-medium text-milsaca-cafezal hover:underline"
          >
            Limpar
          </Link>
        </div>
      ) : null}

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
        <EmptyState hasFilter={activeFilters > 0 || query.length > 0} />
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
