"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { FileText, MoreHorizontal, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { FilterSheet } from "@/components/filter-sheet";
import { deadlineStatus } from "@/lib/deadline";
import {
  OFERTA_STATUS_LABEL,
  OFERTA_STATUS_ORDER,
  OFERTA_STATUS_TONE,
  gerarContratoHref,
  nextOfferAction,
  ofertaTotal,
  type OfertaItem,
  type OfertaStatus,
} from "../_lib/oferta-meta";
import { atualizarStatusOferta, deleteOferta } from "../_actions";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  ...OFERTA_STATUS_ORDER.map((s) => ({ value: s, label: OFERTA_STATUS_LABEL[s] })),
];

type SortKey = "validade" | "valor" | "recente";
const SORT_LABEL: Record<SortKey, string> = {
  validade: "Validade (expira antes)",
  valor: "Maior valor",
  recente: "Mais recente",
};

export function OfertasView({
  ofertas,
  current,
  page,
  totalPages,
}: {
  ofertas: OfertaItem[];
  current: { status?: OfertaStatus };
  page: number;
  totalPages: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("validade");
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = ofertas.filter((o) => {
      if (!q) return true;
      return [o.comprador_nome, o.lote_codigo ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    return [...list].sort((a, b) => {
      if (sort === "valor") return (ofertaTotal(b) ?? 0) - (ofertaTotal(a) ?? 0);
      if (sort === "recente")
        return +new Date(b.created_at) - +new Date(a.created_at);
      // validade asc — expira antes primeiro; sem data vai pro fim
      const da = a.validade_ate ? +new Date(a.validade_ate) : Infinity;
      const db = b.validade_ate ? +new Date(b.validade_ate) : Infinity;
      return da - db;
    });
  }, [ofertas, query, sort]);

  function statusHref(value: string): string {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("status", value);
    else next.delete("status");
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

  const selectClass =
    "h-10 rounded-md border border-neutral-200 bg-white px-3 text-body-sm text-milsaca-cafezal outline-none transition-colors hover:border-milsaca-dourado focus-visible:ring-2 focus-visible:ring-ring/40";

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
            placeholder="Buscar comprador, lote..."
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
          {filtered.length === 1 ? "oferta" : "ofertas"}
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
          {current.status ? (
            <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-milsaca-cafezal px-1 text-[11px] font-bold text-milsaca-cream">
              1
            </span>
          ) : null}
        </button>
        <span className="text-caption text-neutral-500">
          <strong className="text-milsaca-cafezal">{filtered.length}</strong>{" "}
          {filtered.length === 1 ? "oferta" : "ofertas"}
        </span>
      </div>

      {/* DESKTOP: tabela densa */}
      <div className="hidden overflow-hidden rounded-card border border-neutral-200 bg-white shadow-card lg:block">
        <table className="w-full text-body-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-caption font-medium uppercase tracking-wider text-neutral-600">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Comprador</th>
              <th className="px-5 py-3 text-left font-medium">Lote</th>
              <th className="px-5 py-3 text-right font-medium">Preço/sc</th>
              <th className="px-5 py-3 text-right font-medium">Sacas</th>
              <th className="px-5 py-3 text-right font-medium">Valor total</th>
              <th className="px-5 py-3 text-left font-medium">Validade</th>
              <th className="px-5 py-3 text-left font-medium">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filtered.map((o) => {
              const total = ofertaTotal(o);
              const d = deadlineStatus(o.validade_ate);
              return (
                <tr key={o.id} className="transition-colors hover:bg-neutral-50">
                  <td className="px-5 py-3 font-medium text-milsaca-cafezal">
                    {o.comprador_nome}
                  </td>
                  <td className="px-5 py-3 font-mono text-caption text-neutral-600">
                    {o.lote_codigo ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-neutral-700">
                    {BRL.format(o.preco_saca)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-neutral-700">
                    {o.bag_count != null
                      ? o.bag_count.toLocaleString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-milsaca-cafezal">
                    {total != null ? BRL.format(total) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {o.validade_ate ? (
                      d.urgente ? (
                        <StatusBadge tone={d.tone} withDot>
                          {d.label}
                        </StatusBadge>
                      ) : (
                        <span className="tabular-nums text-neutral-600">
                          {d.label}
                        </span>
                      )
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge tone={OFERTA_STATUS_TONE[o.status]}>
                      {OFERTA_STATUS_LABEL[o.status]}
                    </StatusBadge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <OfertaAcoes o={o} />
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
        {filtered.map((o) => (
          <OfertaCard key={o.id} o={o} />
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
        resultNoun={filtered.length === 1 ? "oferta" : "ofertas"}
        onClear={() => {
          router.push(pathname);
          setSheetOpen(false);
        }}
      />
    </div>
  );
}

function OfertaCard({ o }: { o: OfertaItem }) {
  const total = ofertaTotal(o);
  const d = deadlineStatus(o.validade_ate);
  return (
    <div className="rounded-card border border-neutral-200 bg-white p-card shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-h3 font-semibold text-milsaca-cafezal">
          {o.comprador_nome}
        </p>
        <StatusBadge tone={OFERTA_STATUS_TONE[o.status]}>
          {OFERTA_STATUS_LABEL[o.status]}
        </StatusBadge>
      </div>
      {o.validade_ate && d.urgente ? (
        <p className="mt-1">
          <StatusBadge tone={d.tone} withDot>
            {d.label}
          </StatusBadge>
        </p>
      ) : null}
      <p className="mt-2 text-h2 leading-none tabular-nums text-milsaca-cafezal">
        {total != null ? BRL.format(total) : "—"}
      </p>
      <p className="mt-1 text-caption text-neutral-500">
        {o.lote_codigo ? (
          <span className="font-mono">{o.lote_codigo} · </span>
        ) : null}
        {o.bag_count != null ? `${o.bag_count} sc · ` : ""}
        {BRL.format(o.preco_saca)}/sc
        {o.validade_ate && !d.urgente ? ` · vence ${d.label}` : ""}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <OfertaAcoes o={o} />
      </div>
    </div>
  );
}

/** Ações por status (compartilhado tabela + card). Remover fica no menu ⋯. */
function OfertaAcoes({ o }: { o: OfertaItem }) {
  const action = nextOfferAction(o.status);
  return (
    <>
      {action?.type === "decidir" ? (
        <>
          <form action={atualizarStatusOferta}>
            <input type="hidden" name="id" value={o.id} />
            <input type="hidden" name="status" value="aceita" />
            <SubmitButton variant="success" size="sm" pendingLabel="...">
              Aceitar
            </SubmitButton>
          </form>
          <form action={atualizarStatusOferta}>
            <input type="hidden" name="id" value={o.id} />
            <input type="hidden" name="status" value="recusada" />
            <SubmitButton variant="outline" size="sm" pendingLabel="...">
              Recusar
            </SubmitButton>
          </form>
        </>
      ) : action?.type === "enviar" ? (
        <form action={atualizarStatusOferta}>
          <input type="hidden" name="id" value={o.id} />
          <input type="hidden" name="status" value="enviada" />
          <SubmitButton variant="primary" size="sm" pendingLabel="...">
            Enviar
          </SubmitButton>
        </form>
      ) : action?.type === "contrato" ? (
        <Button asChild variant="primary" size="sm">
          <Link href={gerarContratoHref(o)}>
            <FileText className="mr-1 h-3.5 w-3.5" />
            Gerar contrato
          </Link>
        </Button>
      ) : null}

      {/* Menu ⋯ — ação destrutiva fora do clique fácil */}
      <details className="group relative">
        <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-milsaca-cafezal [&::-webkit-details-marker]:hidden">
          <MoreHorizontal className="h-4 w-4" />
        </summary>
        <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-neutral-200 bg-white p-1 shadow-elevated">
          <form action={deleteOferta}>
            <input type="hidden" name="id" value={o.id} />
            <ConfirmSubmit
              variant="ghost"
              size="sm"
              className="h-auto w-full justify-start px-2 py-1.5 text-caption text-danger-700 hover:bg-danger-50"
              confirmTitle="Remover oferta?"
              confirmMessage={<p>A oferta sai do histórico.</p>}
              confirmButtonLabel="Remover"
              pendingLabel="Removendo..."
            >
              Remover oferta
            </ConfirmSubmit>
          </form>
        </div>
      </details>
    </>
  );
}
