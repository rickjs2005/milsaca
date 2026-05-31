"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  MoreHorizontal,
  Pencil,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { FilterSheet } from "@/components/filter-sheet";
import { ConfirmSubmit } from "@/components/confirm-submit";
import {
  PROCESS_FILTERS,
  PROCESS_LABEL,
  SPECIE_FILTERS,
  SPECIE_LABEL,
  SPECIE_TONE,
  cotacaoLabel,
  fonteLabel,
  formatBRL,
  formatDate,
  formatDateShort,
  type CotacaoRow,
  type CotacoesFilter,
} from "../_lib/cotacao-meta";
import { deleteCotacao } from "../_actions";

type SortKey = "recente" | "maior" | "menor";
const SORT_LABEL: Record<SortKey, string> = {
  recente: "Mais recente",
  maior: "Maior preço",
  menor: "Menor preço",
};

function Variacao({
  v,
  base,
  showBase = true,
}: {
  v: number | null;
  base: string | null;
  showBase?: boolean;
}) {
  if (v == null)
    return (
      <span className="text-neutral-400" title="Primeira cotação desta praça">
        —
      </span>
    );
  const up = v > 0.001;
  const down = v < -0.001;
  const baseTxt = base ? `vs ${formatDateShort(base)}` : undefined;
  return (
    <span
      title={base ? `Variação vs cotação de ${formatDate(base)}` : undefined}
      className="inline-flex items-baseline gap-1"
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 font-medium tabular-nums",
          up ? "text-success-700" : down ? "text-danger-700" : "text-neutral-500",
        )}
      >
        {up && <TrendingUp className="h-3.5 w-3.5" />}
        {down && <TrendingDown className="h-3.5 w-3.5" />}
        {v > 0 ? "+" : ""}
        {v.toFixed(2)}%
      </span>
      {showBase && baseTxt ? (
        <span className="text-[11px] font-normal text-neutral-400">
          {baseTxt}
        </span>
      ) : null}
    </span>
  );
}

function Fonte({ source }: { source: string | null }) {
  const { text, isRef } = fonteLabel(source);
  return (
    <span
      title={
        isRef
          ? "Preço informado pela corretora usando essa fonte como referência"
          : "Preço próprio da corretora (praça real)"
      }
      className={cn(
        isRef ? "text-neutral-500" : "font-medium text-milsaca-cafezal",
      )}
    >
      {text}
    </span>
  );
}

function Especie({ c }: { c: CotacaoRow }) {
  if (c.specie)
    return <StatusBadge tone={SPECIE_TONE[c.specie]}>{SPECIE_LABEL[c.specie]}</StatusBadge>;
  return <span className="font-medium text-milsaca-cafezal">{c.coffee_type}</span>;
}

export function CotacoesView({
  cotacoes,
  current,
}: {
  cotacoes: CotacaoRow[];
  current: CotacoesFilter;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recente");
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = cotacoes.filter((c) => {
      if (!q) return true;
      return [
        cotacaoLabel(c),
        c.region ?? "",
        c.source ?? "",
        c.process ? PROCESS_LABEL[c.process] : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    return [...list].sort((a, b) => {
      if (sort === "maior") return b.price - a.price;
      if (sort === "menor") return a.price - b.price;
      // recente — por data de referência, desempate por criação
      const byDate = b.reference_date.localeCompare(a.reference_date);
      return byDate !== 0 ? byDate : b.created_at.localeCompare(a.created_at);
    });
  }, [cotacoes, query, sort]);

  const activeFilters = (current.specie ? 1 : 0) + (current.process ? 1 : 0);

  function filterHref(key: "specie" | "process", value: string): string {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const selectClass =
    "h-10 rounded-md border border-neutral-200 bg-white px-3 text-body-sm text-milsaca-cafezal outline-none transition-colors hover:border-milsaca-dourado focus-visible:ring-2 focus-visible:ring-ring/40";

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar praça, fonte, processo..."
            className="h-10 w-full rounded-md border border-neutral-200 bg-white pl-9 pr-3 text-body-sm text-milsaca-preto placeholder:text-neutral-400 outline-none transition-colors focus-visible:border-milsaca-dourado focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        {/* DESKTOP: processo via select pra não inflar as pills */}
        <select
          aria-label="Filtrar por processo"
          value={current.process ?? ""}
          onChange={(e) => router.push(filterHref("process", e.target.value))}
          className={cn(selectClass, "hidden sm:block")}
        >
          {PROCESS_FILTERS.map((f) => (
            <option key={f.value || "all"} value={f.value}>
              {f.value ? f.label : "Todos os processos"}
            </option>
          ))}
        </select>
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
      </div>

      {/* DESKTOP: pills de espécie */}
      <div className="hidden flex-wrap items-center justify-between gap-3 sm:flex">
        <div className="flex flex-wrap items-center gap-2">
          {SPECIE_FILTERS.map((f) => {
            const active = (current.specie ?? "") === f.value;
            return (
              <Link
                key={f.value || "all"}
                href={filterHref("specie", f.value)}
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
        <span className="whitespace-nowrap text-caption text-neutral-500">
          <strong className="text-milsaca-cafezal">{filtered.length}</strong>{" "}
          {filtered.length === 1 ? "cotação" : "cotações"}
        </span>
      </div>

      {/* MOBILE: botão Filtros */}
      <div className="flex items-center justify-between gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex h-10 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 text-body-sm font-medium text-milsaca-cafezal transition-colors hover:border-milsaca-dourado focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeFilters ? (
            <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-milsaca-cafezal px-1 text-[11px] font-bold text-milsaca-cream">
              {activeFilters}
            </span>
          ) : null}
        </button>
        <span className="text-caption text-neutral-500">
          <strong className="text-milsaca-cafezal">{filtered.length}</strong>{" "}
          {filtered.length === 1 ? "cotação" : "cotações"}
        </span>
      </div>

      {/* Legenda do "atual" */}
      <p className="text-caption text-neutral-500">
        <StatusBadge tone="premium">atual</StatusBadge> = cotação vigente da
        praça — é a que o produtor vê hoje no painel dele.
      </p>

      {/* DESKTOP: tabela */}
      <div className="hidden rounded-card border border-neutral-200 bg-white shadow-card lg:block">
        <table className="w-full text-body-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-caption font-medium uppercase tracking-wider text-neutral-600">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Data</th>
              <th className="px-5 py-3 text-left font-medium">Café</th>
              <th className="px-5 py-3 text-left font-medium">Processo</th>
              <th className="px-5 py-3 text-left font-medium">Praça</th>
              <th className="px-5 py-3 text-right font-medium">Preço (sc 60kg)</th>
              <th className="px-5 py-3 text-right font-medium">Variação</th>
              <th className="px-5 py-3 text-left font-medium">Fonte</th>
              <th className="px-5 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filtered.map((c) => (
              <tr
                key={c.id}
                className={cn(
                  "transition-colors hover:bg-neutral-50",
                  c.vigente && "bg-milsaca-dourado/[0.04]",
                )}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        c.vigente
                          ? "font-medium text-milsaca-cafezal"
                          : "text-neutral-600",
                      )}
                    >
                      {formatDate(c.reference_date)}
                    </span>
                    {c.vigente ? (
                      <StatusBadge tone="premium">atual</StatusBadge>
                    ) : null}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <Especie c={c} />
                </td>
                <td className="px-5 py-3 text-neutral-600">
                  {c.process ? PROCESS_LABEL[c.process] : "—"}
                </td>
                <td className="px-5 py-3 text-neutral-600">{c.region ?? "—"}</td>
                <td className="px-5 py-3 text-right">
                  <span className="font-semibold tabular-nums text-milsaca-cafezal">
                    {formatBRL(c.price)}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <Variacao v={c.variacao_pct} base={c.variacao_base} />
                </td>
                <td className="px-5 py-3">
                  <Fonte source={c.source} />
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <CotacaoAcoes c={c} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE/TABLET: cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {filtered.map((c) => (
          <CotacaoCard key={c.id} c={c} />
        ))}
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        groups={[
          {
            key: "specie",
            label: "Espécie",
            options: SPECIE_FILTERS,
            value: current.specie ?? "",
            onSelect: (v) => router.push(filterHref("specie", v)),
          },
          {
            key: "process",
            label: "Processo",
            options: PROCESS_FILTERS,
            value: current.process ?? "",
            onSelect: (v) => router.push(filterHref("process", v)),
          },
        ]}
        resultCount={filtered.length}
        resultNoun={filtered.length === 1 ? "cotação" : "cotações"}
        onClear={() => {
          router.push(pathname);
          setSheetOpen(false);
        }}
      />
    </div>
  );
}

function CotacaoCard({ c }: { c: CotacaoRow }) {
  return (
    <div
      className={cn(
        "rounded-card border bg-white p-card shadow-card",
        c.vigente ? "border-milsaca-dourado/40" : "border-neutral-200",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Especie c={c} />
          {c.vigente ? <StatusBadge tone="premium">atual</StatusBadge> : null}
        </div>
        <Variacao v={c.variacao_pct} base={c.variacao_base} showBase={false} />
      </div>

      <p className="mt-1 text-caption text-neutral-500">
        {formatDateShort(c.reference_date)}
        {c.region ? ` · ${c.region}` : ""}
      </p>

      <p className="mt-3 text-h3 tabular-nums text-milsaca-cafezal">
        {formatBRL(c.price)}
        <span className="ml-1 text-caption font-normal text-neutral-400">
          / sc 60kg
        </span>
      </p>

      <p className="mt-1 text-caption text-neutral-500">
        {c.process ? PROCESS_LABEL[c.process] : "Sem processo"} ·{" "}
        <Fonte source={c.source} />
      </p>

      <div className="mt-3 flex items-center gap-1 border-t border-neutral-100 pt-3">
        <CotacaoAcoes c={c} full />
      </div>
    </div>
  );
}

function CotacaoAcoes({ c, full = false }: { c: CotacaoRow; full?: boolean }) {
  const desc = `${formatDateShort(c.reference_date)} ${cotacaoLabel(c)}${
    c.region ? ` · ${c.region}` : ""
  }`;
  return (
    <>
      <Link
        href={`/painel/corretora/cotacoes/${c.id}`}
        className={cn(
          "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-3 text-caption font-medium text-milsaca-cafezal transition-colors hover:border-milsaca-dourado hover:bg-milsaca-cream",
          full && "flex-1",
        )}
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </Link>

      <details className="group relative">
        <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-milsaca-cafezal [&::-webkit-details-marker]:hidden">
          <MoreHorizontal className="h-4 w-4" />
        </summary>
        <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-neutral-200 bg-white p-1 shadow-elevated">
          <form action={deleteCotacao}>
            <input type="hidden" name="id" value={c.id} />
            <ConfirmSubmit
              variant="ghost"
              className="h-auto w-full justify-start px-2 py-1.5 text-caption text-danger-700 hover:bg-danger-50"
              confirmTitle="Apagar cotação?"
              confirmMessage={
                <p>
                  Apagar a cotação de <strong>{desc}</strong>?
                  {c.vigente
                    ? " Ela é a cotação vigente desta praça — apagar faz o produtor voltar à anterior (ou ficar sem)."
                    : " Sai do histórico e não aparece mais pro produtor."}
                </p>
              }
              confirmButtonLabel="Apagar"
              pendingLabel="Apagando..."
            >
              Apagar cotação
            </ConfirmSubmit>
          </form>
        </div>
      </details>
    </>
  );
}
