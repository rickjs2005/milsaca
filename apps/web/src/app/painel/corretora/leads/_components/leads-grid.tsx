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
};

const STATUS_FILTERS: { value: "" | LeadStatus; label: string }[] = [
  { value: "", label: "Todos" },
  ...LEAD_STATUS_ORDER.map((s) => ({
    value: s,
    label: LEAD_STATUS_LABEL[s],
  })),
];

type SortKey = "recentes" | "valor" | "quente" | "frio";

const SORT_LABEL: Record<SortKey, string> = {
  recentes: "Mais recentes",
  valor: "Maior valor",
  quente: "Mais quentes",
  frio: "Sem contato há mais tempo",
};

const URG_RANK: Record<Urgencia, number> = { quente: 3, morno: 2, frio: 1 };

function totalOf(l: LeadListItem): number {
  return l.proposed_price != null && l.bag_count != null
    ? l.proposed_price * l.bag_count
    : 0;
}

/**
 * Container client da Central de Leads: toolbar (status na URL p/ deep-link +
 * filtro server; busca, urgência e ordenação como estado local em memória) +
 * lista de cards. Filtro + ordenação juntos tornam a lista operável.
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
  const [urgencia, setUrgencia] = useState<"" | Urgencia>("");
  const [sort, setSort] = useState<SortKey>("recentes");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = leads.filter((l) => {
      if (urgencia && nextActionFor(l).urgencia !== urgencia) return false;
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

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case "valor":
          return totalOf(b) - totalOf(a);
        case "quente":
          return (
            URG_RANK[nextActionFor(b).urgencia] -
            URG_RANK[nextActionFor(a).urgencia]
          );
        case "frio":
          return +new Date(a.updated_at) - +new Date(b.updated_at);
        default:
          return +new Date(b.created_at) - +new Date(a.created_at);
      }
    });
    return sorted;
  }, [leads, urgencia, query, sort]);

  function buildStatusHref(value: string): string {
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

  const hasQuery = query.length > 0;
  const selectClass =
    "h-10 rounded-md border border-neutral-200 bg-white px-3 text-body-sm text-milsaca-cafezal outline-none transition-colors hover:border-milsaca-dourado focus-visible:ring-2 focus-visible:ring-ring/40";

  return (
    <div className="space-y-5">
      {/* TOOLBAR — busca + urgência + ordenação numa faixa só */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[160px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, café, cidade..."
              className="h-10 w-full rounded-md border border-neutral-200 bg-white pl-9 pr-3 text-body-sm text-milsaca-preto placeholder:text-neutral-400 outline-none transition-colors focus-visible:border-milsaca-dourado focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <select
            aria-label="Filtrar por urgência"
            value={urgencia}
            onChange={(e) => setUrgencia(e.target.value as "" | Urgencia)}
            className={selectClass}
          >
            <option value="">Qualquer urgência</option>
            {URGENCIA_FILTER_ORDER.map((u) => (
              <option key={u} value={u}>
                {URGENCIA_LABEL[u]}
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((f) => {
              const active = (current.status ?? "") === f.value;
              return (
                <Link
                  key={`status-${f.value || "all"}`}
                  href={buildStatusHref(f.value)}
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
          <span className="text-caption text-neutral-500">
            <strong className="text-milsaca-cafezal">{filtered.length}</strong>{" "}
            {filtered.length === 1 ? "lead" : "leads"}
            {hasQuery ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="ml-2 inline-flex items-center gap-1 font-medium text-milsaca-cafezal hover:underline"
              >
                <X className="h-3 w-3" />
                limpar busca
              </button>
            ) : null}
          </span>
        </div>
      </div>

      {/* GRID */}
      {filtered.length === 0 ? (
        <EmptyState hasFilter={Boolean(current.status) || hasQuery || !!urgencia} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((lead) => (
            <LeadCard key={lead.id} lead={lead} corretoraName={corretoraName} />
          ))}
        </div>
      )}

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
