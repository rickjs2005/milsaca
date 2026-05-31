"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CheckCircle2, FileText, MoreHorizontal, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/pagination";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { FilterSheet } from "@/components/filter-sheet";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { deadlineStatus } from "@/lib/deadline";
import {
  PAGAMENTO_STATUS_LABEL,
  PAGAMENTO_STATUS_ORDER,
  PAGAMENTO_STATUS_TONE,
  isPagamentoAberto,
  nextPaymentAction,
  type PagamentoItem,
  type PagamentoStatus,
} from "../_lib/pagamento-meta";
import { cancelarPagamento } from "../_actions";
import { MarcarPagoButton } from "./marcar-pago-button";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  ...PAGAMENTO_STATUS_ORDER.map((s) => ({
    value: s,
    label: PAGAMENTO_STATUS_LABEL[s],
  })),
];

type SortKey = "previsto" | "recente";
const SORT_LABEL: Record<SortKey, string> = {
  previsto: "Previsto (vencidos antes)",
  recente: "Mais recente",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

/** Semáforo de vencimento — só pra pagamentos em aberto. */
function prazo(p: PagamentoItem): { label: string; tone: StatusTone } {
  if (p.status === "pago")
    return { label: `pago ${fmtDate(p.data_paga)}`, tone: "success" };
  if (p.status === "cancelado") return { label: "—", tone: "neutral" };
  if (!p.data_prevista) return { label: "sem data", tone: "neutral" };
  const d = deadlineStatus(p.data_prevista);
  const dias = d.dias ?? 0;
  if (dias < 0) return { label: `venceu há ${-dias}d`, tone: "danger" };
  if (dias === 0) return { label: "vence hoje", tone: "warning" };
  if (dias === 1) return { label: "vence amanhã", tone: "warning" };
  if (dias <= 7) return { label: `em ${dias}d`, tone: "warning" };
  return { label: fmtDate(p.data_prevista), tone: "neutral" };
}

export function PagamentosView({
  itens,
  comprovanteUrls,
  current,
  page,
  totalPages,
}: {
  itens: PagamentoItem[];
  comprovanteUrls: Record<string, string>;
  current: { status?: PagamentoStatus };
  page: number;
  totalPages: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("previsto");
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = itens.filter((p) => {
      if (!q) return true;
      return [p.produtor_nome, p.contrato_code ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    return [...list].sort((a, b) => {
      if (sort === "recente")
        return +new Date(b.created_at) - +new Date(a.created_at);
      // previsto asc — vencidos/mais próximos primeiro; sem data por último
      const da = a.data_prevista ? +new Date(a.data_prevista) : Infinity;
      const db = b.data_prevista ? +new Date(b.data_prevista) : Infinity;
      return da - db;
    });
  }, [itens, query, sort]);

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
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produtor, contrato..."
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
          {filtered.length === 1 ? "pagamento" : "pagamentos"}
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
          {filtered.length === 1 ? "pagamento" : "pagamentos"}
        </span>
      </div>

      {/* DESKTOP: tabela */}
      <div className="hidden rounded-card border border-neutral-200 bg-white shadow-card lg:block">
        <table className="w-full text-body-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-caption font-medium uppercase tracking-wider text-neutral-600">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Produtor</th>
              <th className="px-5 py-3 text-left font-medium">Contrato</th>
              <th className="px-5 py-3 text-right font-medium">Líquido</th>
              <th className="px-5 py-3 text-left font-medium">Vencimento</th>
              <th className="px-5 py-3 text-left font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filtered.map((p) => {
              const pz = prazo(p);
              return (
                <tr key={p.id} className="transition-colors hover:bg-neutral-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-milsaca-cafezal">
                      {p.produtor_nome}
                    </p>
                    {p.entrega_conferida ? (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-success-700">
                        <CheckCircle2 className="h-3 w-3" />
                        entrega conferida
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 font-mono text-neutral-600">
                    {p.contrato_code ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="font-semibold tabular-nums text-milsaca-cafezal">
                      {BRL.format(p.valor_liquido)}
                    </span>
                    <span className="block text-[11px] tabular-nums text-neutral-400">
                      bruto {BRL.format(p.valor_bruto)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge tone={pz.tone} withDot={pz.tone === "danger"}>
                      {pz.label}
                    </StatusBadge>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge tone={PAGAMENTO_STATUS_TONE[p.status]}>
                      {PAGAMENTO_STATUS_LABEL[p.status]}
                    </StatusBadge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <PagamentoAcoes p={p} comprovanteUrls={comprovanteUrls} />
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
        {filtered.map((p) => (
          <PagamentoCard
            key={p.id}
            p={p}
            comprovanteUrls={comprovanteUrls}
          />
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
        resultNoun={filtered.length === 1 ? "pagamento" : "pagamentos"}
        onClear={() => {
          router.push(pathname);
          setSheetOpen(false);
        }}
      />
    </div>
  );
}

function PagamentoCard({
  p,
  comprovanteUrls,
}: {
  p: PagamentoItem;
  comprovanteUrls: Record<string, string>;
}) {
  const pz = prazo(p);
  return (
    <div className="rounded-card border border-neutral-200 bg-white p-card shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-milsaca-cafezal">
            {p.produtor_nome}
          </p>
          <p className="mt-0.5 font-mono text-caption text-neutral-500">
            {p.contrato_code ?? "—"}
          </p>
        </div>
        <StatusBadge tone={PAGAMENTO_STATUS_TONE[p.status]}>
          {PAGAMENTO_STATUS_LABEL[p.status]}
        </StatusBadge>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="text-h3 tabular-nums text-milsaca-cafezal">
            {BRL.format(p.valor_liquido)}
          </p>
          <p className="text-[11px] tabular-nums text-neutral-400">
            bruto {BRL.format(p.valor_bruto)}
          </p>
        </div>
        <StatusBadge tone={pz.tone} withDot={pz.tone === "danger"}>
          {pz.label}
        </StatusBadge>
      </div>

      {p.entrega_conferida ? (
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-success-700">
          <CheckCircle2 className="h-3 w-3" />
          entrega conferida — repasse liberado
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <PagamentoAcoes p={p} comprovanteUrls={comprovanteUrls} full />
      </div>
    </div>
  );
}

function PagamentoAcoes({
  p,
  comprovanteUrls,
  full = false,
}: {
  p: PagamentoItem;
  comprovanteUrls: Record<string, string>;
  full?: boolean;
}) {
  const action = nextPaymentAction(p);
  const comprovanteUrl = comprovanteUrls[p.id];

  return (
    <>
      {action.kind === "pay" ? (
        <div className={full ? "flex-1" : undefined}>
          <MarcarPagoButton
            id={p.id}
            valorLiquido={p.valor_liquido}
            produtorNome={p.produtor_nome}
            full={full}
          />
        </div>
      ) : null}

      {action.kind === "view-comprovante" && comprovanteUrl ? (
        <a
          href={comprovanteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-3 text-caption font-medium text-milsaca-cafezal transition-colors hover:border-milsaca-dourado hover:bg-milsaca-cream",
            full && "flex-1",
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          {action.label}
        </a>
      ) : null}

      {isPagamentoAberto(p.status) ? (
        <details className="group relative">
          <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-milsaca-cafezal [&::-webkit-details-marker]:hidden">
            <MoreHorizontal className="h-4 w-4" />
          </summary>
          <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-neutral-200 bg-white p-1 shadow-elevated">
            <form action={cancelarPagamento}>
              <input type="hidden" name="id" value={p.id} />
              <ConfirmSubmit
                variant="ghost"
                className="h-auto w-full justify-start px-2 py-1.5 text-caption text-danger-700 hover:bg-danger-50"
                confirmTitle="Cancelar pagamento?"
                confirmMessage={
                  <p>
                    O registro fica como cancelado (não some do histórico) e o
                    produtor deixa de ver este valor a receber.
                  </p>
                }
                confirmButtonLabel="Cancelar pagamento"
                pendingLabel="Cancelando..."
              >
                Cancelar pagamento
              </ConfirmSubmit>
            </form>
          </div>
        </details>
      ) : null}
    </>
  );
}
