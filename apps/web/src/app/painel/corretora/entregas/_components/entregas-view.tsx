"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUrlFilter } from "@/hooks/use-url-filter";
import { useLocalSearchSort } from "@/hooks/use-local-search-sort";
import { useState } from "react";
import {
  ArrowRight,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtInt } from "@/lib/format";
import { Pagination } from "@/components/pagination";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { FilterSheet } from "@/components/filter-sheet";
import { deadlineStatus } from "@/lib/deadline";
import {
  ENTREGA_STATUS_LABEL,
  ENTREGA_STATUS_ORDER,
  ENTREGA_STATUS_TONE,
  nextDeliveryAction,
  sacasRecebidas,
  type EntregaListItem,
  type EntregaStatus,
} from "../_lib/entrega-meta";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  ...ENTREGA_STATUS_ORDER.map((s) => ({
    value: s,
    label: ENTREGA_STATUS_LABEL[s],
  })),
];

type SortKey = "prevista" | "recente";
const SORT_LABEL: Record<SortKey, string> = {
  prevista: "Prevista (atrasadas antes)",
  recente: "Mais recente",
};

const RECEBIDA_OU_CONFERIDA: EntregaStatus[] = ["recebida", "conferida"];

/** Semáforo de prazo de entrega — reusa o tom do deadlineStatus, wording próprio. */
function prazo(e: EntregaListItem): { label: string; tone: StatusTone } {
  if (e.status === "conferida" || e.status === "recebida") {
    const dr = e.data_realizada;
    return {
      label: dr ? `entregue ${fmtDate(dr)}` : "entregue",
      tone: "success",
    };
  }
  if (e.status === "cancelada") return { label: "—", tone: "neutral" };
  if (!e.data_prevista) return { label: "sem data", tone: "neutral" };
  const d = deadlineStatus(e.data_prevista);
  const dias = d.dias ?? 0;
  if (dias < 0)
    return { label: `atrasada há ${-dias}d`, tone: "danger" };
  if (dias === 0) return { label: "hoje", tone: "warning" };
  if (dias === 1) return { label: "amanhã", tone: "warning" };
  if (dias <= 7) return { label: `em ${dias}d`, tone: "warning" };
  return { label: fmtDate(e.data_prevista), tone: "neutral" };
}

function fmtDate(iso: string) {
  const [y = "", m = "", d = ""] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

/** Sacas: "93 prev" e, quando recebida/conferida, "· 91 receb (‑2)". */
function SacasCell({ e }: { e: EntregaListItem }) {
  const prev = e.bag_count;
  const receb = RECEBIDA_OU_CONFERIDA.includes(e.status)
    ? sacasRecebidas(e)
    : null;
  const quebra = prev != null && receb != null ? receb - prev : null;
  return (
    <span className="tabular-nums text-neutral-700">
      {prev != null ? `${fmtInt(prev)} prev` : "—"}
      {receb != null ? (
        <>
          {" · "}
          <span className="text-milsaca-cafezal">{fmtInt(receb)} receb</span>
          {quebra != null && quebra !== 0 ? (
            <span
              className={cn(
                "ml-1 font-medium",
                quebra < 0 ? "text-danger-700" : "text-success-700",
              )}
            >
              ({quebra > 0 ? "+" : ""}
              {quebra})
            </span>
          ) : null}
        </>
      ) : null}
    </span>
  );
}

export function EntregasView({
  entregas,
  current,
  page,
  totalPages,
}: {
  entregas: EntregaListItem[];
  current: { status?: EntregaStatus };
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const { pathname, filterHref, pageHref } = useUrlFilter();
  const { query, setQuery, sort, setSort, filtered } = useLocalSearchSort<
    EntregaListItem,
    SortKey
  >(entregas, {
    initialSort: "prevista",
    searchFields: (e) => [e.contrato_code, e.produtor_nome],
    compare: (a, b, sortKey) => {
      if (sortKey === "recente")
        return +new Date(b.created_at) - +new Date(a.created_at);
      // prevista asc — sem data por último
      const da = a.data_prevista ? +new Date(a.data_prevista) : Infinity;
      const db = b.data_prevista ? +new Date(b.data_prevista) : Infinity;
      return da - db;
    },
  });
  const [sheetOpen, setSheetOpen] = useState(false);

  const statusHref = (value: string) => filterHref("status", value);

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
            placeholder="Buscar contrato, produtor..."
            className="h-10 w-full rounded-md border border-neutral-200 bg-white pl-9 pr-3 text-body-sm text-milsaca-preto placeholder:text-neutral-400 outline-none transition-colors focus-visible:border-milsaca-dourado focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
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

      {/* DESKTOP: status pills */}
      <div className="hidden flex-wrap items-center justify-between gap-3 sm:flex">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => {
            const active = (current.status ?? "") === f.value;
            return (
              <Link
                key={`st-${f.value || "all"}`}
                href={statusHref(f.value)}
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
          {filtered.length === 1 ? "entrega" : "entregas"}
        </span>
      </div>

      {/* MOBILE: Filtros */}
      <div className="flex items-center justify-between gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex h-10 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 text-body-sm font-medium text-milsaca-cafezal transition-colors hover:border-milsaca-dourado focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {current.status ? (
            <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-milsaca-cafezal px-1 text-[11px] font-bold text-milsaca-cream">
              1
            </span>
          ) : null}
        </button>
        <span className="text-caption text-neutral-500">
          <strong className="text-milsaca-cafezal">{filtered.length}</strong>{" "}
          {filtered.length === 1 ? "entrega" : "entregas"}
        </span>
      </div>

      {/* DESKTOP: tabela */}
      <div className="hidden rounded-card border border-neutral-200 bg-white shadow-card lg:block">
        <table className="w-full text-body-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-caption font-medium uppercase tracking-wider text-neutral-600">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Contrato</th>
              <th className="px-5 py-3 text-left font-medium">Produtor</th>
              <th className="px-5 py-3 text-left font-medium">Sacas (prev/receb)</th>
              <th className="px-5 py-3 text-left font-medium">Prevista</th>
              <th className="px-5 py-3 text-left font-medium">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filtered.map((e) => {
              const pz = prazo(e);
              return (
                <tr key={e.id} className="transition-colors hover:bg-neutral-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/painel/corretora/entregas/${e.id}`}
                      className="font-mono font-medium text-milsaca-cafezal hover:underline"
                    >
                      {e.contrato_code}
                      <span className="text-neutral-400"> #{e.sequencia}</span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-neutral-700">
                    {e.produtor_nome}
                  </td>
                  <td className="px-5 py-3">
                    <SacasCell e={e} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge tone={pz.tone} withDot={pz.tone === "danger"}>
                      {pz.label}
                    </StatusBadge>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge tone={ENTREGA_STATUS_TONE[e.status]}>
                      {ENTREGA_STATUS_LABEL[e.status]}
                    </StatusBadge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <EntregaAcoes e={e} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE/TABLET: cards */}
      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {filtered.map((e) => (
          <EntregaCard key={e.id} e={e} />
        ))}
      </div>

      {totalPages > 1 ? (
        <div className="border-t border-neutral-200 pt-4">
          <Pagination page={page} totalPages={totalPages} hrefFor={pageHref} />
        </div>
      ) : null}

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        groups={[
          {
            key: "status",
            label: "Status",
            options: STATUS_FILTERS,
            value: current.status ?? "",
            onSelect: (v) => router.push(statusHref(v)),
          },
        ]}
        resultCount={filtered.length}
        resultNoun={filtered.length === 1 ? "entrega" : "entregas"}
        onClear={() => {
          router.push(pathname);
          setSheetOpen(false);
        }}
      />
    </div>
  );
}

function EntregaCard({ e }: { e: EntregaListItem }) {
  const pz = prazo(e);
  const receb = RECEBIDA_OU_CONFERIDA.includes(e.status)
    ? sacasRecebidas(e)
    : null;
  return (
    <div className="rounded-card border border-neutral-200 bg-white p-card shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-body-sm font-semibold text-milsaca-cafezal">
          {e.contrato_code}
          <span className="text-neutral-400"> #{e.sequencia}</span>
        </p>
        <StatusBadge tone={ENTREGA_STATUS_TONE[e.status]}>
          {ENTREGA_STATUS_LABEL[e.status]}
        </StatusBadge>
      </div>
      <p className="mt-1">
        <StatusBadge tone={pz.tone} withDot={pz.tone === "danger"}>
          {pz.label}
        </StatusBadge>
      </p>
      <p className="mt-2 text-body-sm text-milsaca-cafezal">
        {e.bag_count != null ? `${fmtInt(e.bag_count)} sacas previstas` : "—"}
        {receb != null ? ` · ${fmtInt(receb)} recebidas` : ""}
      </p>
      <p className="mt-0.5 text-caption text-neutral-500">{e.produtor_nome}</p>
      <div className="mt-3 flex items-center gap-2">
        <EntregaAcoes e={e} />
      </div>
    </div>
  );
}

function EntregaAcoes({ e }: { e: EntregaListItem }) {
  const action = nextDeliveryAction(e);
  return (
    <>
      <Link
        href={action.href}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-milsaca-cafezal px-3 text-caption font-semibold text-milsaca-cream transition-colors hover:bg-milsaca-folha focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {action.label}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>

      {e.status === "conferida" ? (
        <Link
          href="/painel/corretora/pagamentos"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-success-600/40 bg-success-50 px-3 text-caption font-semibold text-success-700 transition-colors hover:bg-success-100"
        >
          <Wallet className="h-3.5 w-3.5" />
          Liberar pagamento
        </Link>
      ) : null}

      <details className="group relative">
        <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-milsaca-cafezal [&::-webkit-details-marker]:hidden">
          <MoreHorizontal className="h-4 w-4" />
        </summary>
        <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-neutral-200 bg-white p-1 shadow-elevated">
          <Link
            href={`/painel/corretora/entregas/${e.id}`}
            className="block rounded px-2 py-1.5 text-caption text-milsaca-cafezal hover:bg-milsaca-cream"
          >
            Ver romaneio / detalhes
          </Link>
        </div>
      </details>
    </>
  );
}
