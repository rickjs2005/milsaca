"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Inbox, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/pagination";
import { EmptyState as SharedEmptyState } from "@/components/empty-state";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUS_ORDER,
  type LeadListItem,
  type LeadStatus,
} from "../_lib/lead-meta";
import {
  nextActionFor,
  URGENCIA_FILTER_ORDER,
  URGENCIA_LABEL,
  type Urgencia,
} from "../_lib/next-action";
import { LeadCard } from "./lead-card";

type ToolbarState = {
  status?: LeadStatus;
  urgencia?: Urgencia;
};

const STATUS_FILTERS: { value: "" | LeadStatus; label: string }[] = [
  { value: "", label: "Todos" },
  ...LEAD_STATUS_ORDER.map((s) => ({
    value: s,
    label: LEAD_STATUS_LABEL[s],
  })),
];

const URGENCIA_FILTERS: { value: "" | Urgencia; label: string }[] = [
  { value: "", label: "Qualquer urgência" },
  ...URGENCIA_FILTER_ORDER.map((u) => ({
    value: u,
    label: URGENCIA_LABEL[u],
  })),
];

/**
 * Container client da Central de Leads: toolbar (status URL, urgência URL,
 * busca client-state) + lista de cards.
 *
 * Filtros vão pra URL pra deep link e refresh seguros — exceto a busca,
 * que é estado local pra não criar history junk a cada tecla.
 *
 * O server já trouxe os leads filtrados por status; aqui aplicamos
 * urgência (derivada) e query em memória.
 */
export function LeadsGrid({
  leads,
  corretoraName,
  current,
  page,
  totalPages,
}: {
  leads: LeadListItem[];
  corretoraName: string;
  current: ToolbarState;
  page: number;
  totalPages: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (current.urgencia) {
        const u = nextActionFor(l).urgencia;
        if (u !== current.urgencia) return false;
      }
      if (!q) return true;
      const haystack = [
        l.produtor_nome,
        l.coffee_type ?? "",
        l.city ?? "",
        l.state ?? "",
        l.produtor_phone ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [leads, current.urgencia, query]);

  function buildHref(key: "status" | "urgencia", value: string): string {
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

  const hasAnyUrl =
    Boolean(current.status) || Boolean(current.urgencia);
  const hasQuery = query.length > 0;
  const hasAnyFilter = hasAnyUrl || hasQuery;

  return (
    <div className="space-y-5">
      {/* ============= TOOLBAR ============= */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, café, cidade..."
              className="h-10 w-full rounded-md border border-neutral-200 bg-white pl-9 pr-3 text-body-sm text-milsaca-preto placeholder:text-neutral-400 outline-none transition-colors focus-visible:border-milsaca-dourado focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <div className="flex items-center gap-3 text-caption text-neutral-500">
            <span>
              <strong className="text-milsaca-verde">{filtered.length}</strong>{" "}
              {filtered.length === 1 ? "lead" : "leads"}
            </span>
            {hasAnyFilter ? (
              <>
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
                {hasAnyUrl ? (
                  <Link
                    href={pathname}
                    onClick={() => setQuery("")}
                    className="inline-flex items-center gap-1 font-medium text-milsaca-cafezal hover:underline"
                  >
                    <X className="h-3 w-3" />
                    limpar filtros
                  </Link>
                ) : null}
              </>
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
            Urgência
          </span>
          {URGENCIA_FILTERS.map((f) => {
            const active = (current.urgencia ?? "") === f.value;
            return (
              <Link
                key={`urgencia-${f.value || "all"}`}
                href={buildHref("urgencia", f.value)}
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
      </div>

      {/* ============= GRID ============= */}
      {filtered.length === 0 ? (
        <EmptyState hasFilter={hasAnyFilter} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              corretoraName={corretoraName}
            />
          ))}
        </div>
      )}

      {/* Paginação server-side. A busca e a urgência filtram apenas a
          página atual; pra varrer tudo, navegue pelas páginas. */}
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
        icon={Inbox}
        title={
          hasFilter
            ? "Nenhum lead com esse filtro"
            : "Sua central de leads está vazia"
        }
        description={
          hasFilter
            ? "Tente afrouxar os filtros ou criar um novo lead manualmente."
            : "Compartilhe seu perfil público da corretora pra começar a receber contatos."
        }
        cta={{ label: "Cadastrar lead", href: "/painel/corretora/leads/novo" }}
        secondaryCta={
          hasFilter
            ? undefined
            : { label: "Ver perfil público", href: "/painel/corretora/perfil" }
        }
      />
    </div>
  );
}
