"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  MoreHorizontal,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { FilterSheet } from "@/components/filter-sheet";
import {
  CONTRATO_STATUS_LABEL,
  CONTRATO_STATUS_ORDER,
  CONTRATO_STATUS_TONE,
  contratoVerificavel,
  nextContractAction,
  type ContratoListItem,
  type ContratoStatus,
} from "../_lib/contrato-meta";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  ...CONTRATO_STATUS_ORDER.map((s) => ({
    value: s,
    label: CONTRATO_STATUS_LABEL[s],
  })),
];

type SortKey = "recente" | "valor" | "status";
const SORT_LABEL: Record<SortKey, string> = {
  recente: "Mais recente",
  valor: "Maior valor",
  status: "Status",
};

function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

/** Assinatura: data quando assinado; "aguardando há N dias" quando pendente. */
function assinatura(c: ContratoListItem): {
  label: string;
  tone: "success" | "warning" | "neutral";
  icon: boolean;
} {
  if (c.signed_at)
    return { label: fmtDate(c.signed_at), tone: "success", icon: true };
  if (c.status === "rascunho" || c.status === "em_analise") {
    const dias = Math.floor(
      (Date.now() - new Date(c.created_at).getTime()) / 86_400_000,
    );
    return {
      label: dias <= 0 ? "aguardando hoje" : `aguard. há ${dias}d`,
      tone: dias >= 2 ? "warning" : "neutral",
      icon: false,
    };
  }
  return { label: "—", tone: "neutral", icon: false };
}

export function ContratosView({
  contratos,
  current,
  page,
  totalPages,
}: {
  contratos: ContratoListItem[];
  current: { status?: ContratoStatus };
  page: number;
  totalPages: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recente");
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = contratos.filter((c) => {
      if (!q) return true;
      return [c.code, c.produtor_nome, c.comprador_nome ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    return [...list].sort((a, b) => {
      if (sort === "valor") return (b.total_value ?? 0) - (a.total_value ?? 0);
      if (sort === "status")
        return (
          CONTRATO_STATUS_ORDER.indexOf(a.status) -
          CONTRATO_STATUS_ORDER.indexOf(b.status)
        );
      return +new Date(b.updated_at) - +new Date(a.updated_at);
    });
  }, [contratos, query, sort]);

  const totalSoma = filtered.reduce((s, c) => s + (c.total_value ?? 0), 0);

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
      {/* Busca + ordenar */}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar código, produtor, comprador..."
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
          {filtered.length === 1 ? "contrato" : "contratos"}
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
          {filtered.length === 1 ? "contrato" : "contratos"}
        </span>
      </div>

      {/* DESKTOP: tabela (sem overflow-hidden em ancestral por causa do menu ⋯) */}
      <div className="hidden rounded-card border border-neutral-200 bg-white shadow-card lg:block">
        <table className="w-full text-body-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-caption font-medium uppercase tracking-wider text-neutral-600">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Código</th>
              <th className="px-5 py-3 text-left font-medium">Produtor → Comprador</th>
              <th className="px-5 py-3 text-right font-medium">Sacas</th>
              <th className="px-5 py-3 text-right font-medium">Valor total</th>
              <th className="px-5 py-3 text-right font-medium">Comissão</th>
              <th className="px-5 py-3 text-left font-medium">Status</th>
              <th className="px-5 py-3 text-left font-medium">Assinado em</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filtered.map((c) => {
              const a = assinatura(c);
              return (
                <tr key={c.id} className="transition-colors hover:bg-neutral-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/painel/corretora/contratos/${c.id}`}
                      className="font-mono font-medium text-milsaca-cafezal hover:underline"
                    >
                      {c.code}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-neutral-700">
                    {c.produtor_nome}
                    <span className="text-neutral-400"> → </span>
                    <span className="text-milsaca-cafezal">
                      {c.comprador_nome ?? "—"}
                    </span>
                    {c.coffee_type ? (
                      <span className="block text-caption text-neutral-500">
                        {c.coffee_type}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-neutral-700">
                    {c.bag_count != null
                      ? c.bag_count.toLocaleString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-milsaca-cafezal">
                    {c.total_value != null ? BRL.format(c.total_value) : "—"}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-dourado-texto">
                    {c.comissao_total != null ? BRL.format(c.comissao_total) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge tone={CONTRATO_STATUS_TONE[c.status]}>
                      {CONTRATO_STATUS_LABEL[c.status]}
                    </StatusBadge>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-caption tabular-nums",
                        a.tone === "success"
                          ? "text-success-700"
                          : a.tone === "warning"
                            ? "font-medium text-warning-700"
                            : "text-neutral-500",
                      )}
                    >
                      {a.icon ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                      {a.label}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <ContratoAcoes c={c} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-neutral-200 bg-neutral-50/60">
            <tr>
              <td
                className="px-5 py-3 text-caption font-semibold uppercase tracking-wider text-neutral-500"
                colSpan={3}
              >
                Total ({filtered.length})
              </td>
              <td className="px-5 py-3 text-right font-bold tabular-nums text-milsaca-cafezal">
                {BRL.format(totalSoma)}
              </td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* MOBILE/TABLET: cards */}
      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {filtered.map((c) => (
          <ContratoCard key={c.id} c={c} />
        ))}
        {filtered.length > 0 ? (
          <div className="flex items-center justify-between rounded-card border border-neutral-200 bg-neutral-50/60 px-card py-3">
            <span className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
              Total ({filtered.length})
            </span>
            <span className="text-body-sm font-bold tabular-nums text-milsaca-cafezal">
              {BRL.format(totalSoma)}
            </span>
          </div>
        ) : null}
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
        resultNoun={filtered.length === 1 ? "contrato" : "contratos"}
        onClear={() => {
          router.push(pathname);
          setSheetOpen(false);
        }}
      />
    </div>
  );
}

function ContratoCard({ c }: { c: ContratoListItem }) {
  const a = assinatura(c);
  return (
    <div className="rounded-card border border-neutral-200 bg-white p-card shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-body-sm font-semibold text-milsaca-cafezal">
          {c.code}
        </p>
        <StatusBadge tone={CONTRATO_STATUS_TONE[c.status]}>
          {CONTRATO_STATUS_LABEL[c.status]}
        </StatusBadge>
      </div>
      <p className="mt-2 text-h2 leading-none tabular-nums text-milsaca-cafezal">
        {c.total_value != null ? BRL.format(c.total_value) : "—"}
      </p>
      <p className="mt-1 text-caption text-neutral-500">
        {c.produtor_nome} → {c.comprador_nome ?? "—"}
        {c.coffee_type ? ` · ${c.coffee_type}` : ""}
        {c.bag_count != null ? ` · ${c.bag_count} sc` : ""}
      </p>
      <p
        className={cn(
          "mt-1 inline-flex items-center gap-1 text-caption",
          a.tone === "success"
            ? "text-success-700"
            : a.tone === "warning"
              ? "font-medium text-warning-700"
              : "text-neutral-500",
        )}
      >
        {a.icon ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
        {c.signed_at ? "Assinado " : ""}
        {a.label}
        {c.comissao_total != null
          ? ` · comissão ${BRL.format(c.comissao_total)}`
          : ""}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <ContratoAcoes c={c} />
      </div>
    </div>
  );
}

/** Ações por estágio (tabela + card). Verificar público quando ativo. */
function ContratoAcoes({ c }: { c: ContratoListItem }) {
  const action = nextContractAction(c);
  return (
    <>
      <Link
        href={action.href}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-milsaca-cafezal px-3 text-caption font-semibold text-milsaca-cream transition-colors hover:bg-milsaca-folha focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {action.label}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>

      {contratoVerificavel(c.status) ? (
        <Link
          href={`/contratos/${c.id}/verificar`}
          target="_blank"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-3 text-caption font-semibold text-milsaca-cafezal transition-colors hover:border-milsaca-dourado/50"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Verificar
        </Link>
      ) : null}

      <details className="group relative">
        <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-milsaca-cafezal [&::-webkit-details-marker]:hidden">
          <MoreHorizontal className="h-4 w-4" />
        </summary>
        <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-neutral-200 bg-white p-1 shadow-elevated">
          <Link
            href={`/painel/corretora/contratos/${c.id}`}
            className="block rounded px-2 py-1.5 text-caption text-milsaca-cafezal hover:bg-milsaca-cream"
          >
            Ver detalhes
          </Link>
          <Link
            href={`/painel/corretora/contratos/${c.id}/espelho`}
            className="block rounded px-2 py-1.5 text-caption text-milsaca-cafezal hover:bg-milsaca-cream"
          >
            Ver espelho (PDF)
          </Link>
        </div>
      </details>
    </>
  );
}
