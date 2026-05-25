"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Inbox, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
}: {
  leads: LeadListItem[];
  corretoraName: string;
  current: ToolbarState;
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
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-milsaca-verde-claro/60" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, café, cidade..."
              className="h-9 w-full rounded-md border border-milsaca-cream-escuro bg-white pl-9 pr-3 text-sm text-milsaca-verde placeholder:text-milsaca-verde-claro/50 outline-none transition-colors focus:border-milsaca-dourado/60 focus:ring-2 focus:ring-milsaca-dourado/20"
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-milsaca-verde-claro">
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
                    className="inline-flex items-center gap-1 text-milsaca-cafezal hover:underline"
                  >
                    <X className="h-3 w-3" />
                    limpar busca
                  </button>
                ) : null}
                {hasAnyUrl ? (
                  <Link
                    href={pathname}
                    onClick={() => setQuery("")}
                    className="inline-flex items-center gap-1 text-milsaca-cafezal hover:underline"
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
            Urgência
          </span>
          {URGENCIA_FILTERS.map((f) => {
            const active = (current.urgencia ?? "") === f.value;
            return (
              <Link
                key={`urgencia-${f.value || "all"}`}
                href={buildHref("urgencia", f.value)}
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
    </div>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="rounded-card border border-dashed border-milsaca-cream-escuro bg-white/40 px-6 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
        <Inbox className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-milsaca-verde">
        {hasFilter
          ? "Nenhum lead com esse filtro."
          : "Sua central de leads está vazia."}
      </p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-milsaca-verde-claro">
        {hasFilter
          ? "Tente afrouxar os filtros ou criar um novo lead manualmente."
          : "Compartilhe seu perfil público da corretora pra começar a receber contatos."}
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <Link
          href="/painel/corretora/leads/novo"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-milsaca-cafezal px-3 text-xs font-semibold text-milsaca-cream transition-colors hover:bg-milsaca-folha"
        >
          Cadastrar lead
        </Link>
        {!hasFilter ? (
          <Link
            href="/painel/corretora/perfil"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-milsaca-cream-escuro px-3 text-xs font-semibold text-milsaca-verde-claro transition-colors hover:text-milsaca-verde"
          >
            Ver perfil público
          </Link>
        ) : null}
      </div>
    </div>
  );
}
