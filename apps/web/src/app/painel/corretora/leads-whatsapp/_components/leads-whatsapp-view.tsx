"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDateTime } from "@/lib/format";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { useUrlFilter } from "@/hooks/use-url-filter";
import {
  SOURCE_FILTERS,
  SOURCE_META,
  type WhatsAppLeadItem,
} from "../_lib/meta";

export function LeadsWhatsAppView({
  leads,
  currentSource,
  page,
  totalPages,
}: {
  leads: WhatsAppLeadItem[];
  currentSource: string | null;
  page: number;
  totalPages: number;
}) {
  const { filterHref, pageHref } = useUrlFilter();

  return (
    <div className="space-y-4">
      {/* Filtro de origem */}
      <div className="flex flex-wrap items-center gap-2 text-body-sm">
        <span className="text-neutral-600">Filtrar origem:</span>
        {SOURCE_FILTERS.map((s) => {
          const active = (currentSource ?? "") === s.value;
          return (
            <Link
              key={s.value || "all"}
              href={filterHref("source", s.value)}
              className={cn(
                "rounded-pill px-3 py-1 text-caption font-medium transition-colors",
                active
                  ? "bg-milsaca-cafezal text-milsaca-cream"
                  : "border border-neutral-200 text-neutral-600 hover:border-milsaca-dourado/50 hover:text-milsaca-cafezal",
              )}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-card border border-neutral-200 bg-white shadow-card">
        {leads.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Nenhum lead WhatsApp ainda"
            description={
              currentSource
                ? "Nenhum lead com esse filtro de origem. Tente ver todas as origens."
                : "Conforme produtores cliquem em “Falar no WhatsApp” no catálogo, eles aparecem aqui antes mesmo de você receber a mensagem."
            }
          />
        ) : (
          <table className="w-full text-body-sm">
            <thead className="bg-neutral-50 text-left text-caption uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Quando</th>
                <th className="px-4 py-3 font-medium">Produtor</th>
                <th className="px-4 py-3 font-medium">Origem</th>
                <th className="px-4 py-3 font-medium">Mensagem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {leads.map((r) => {
                const meta = SOURCE_META[r.source];
                return (
                  <tr key={r.id} className="align-top hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-4 py-3 text-caption text-neutral-600">
                      {fmtDateTime(r.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {r.produtor_nome ? (
                        <div>
                          <p className="font-medium text-milsaca-cafezal">
                            {r.produtor_nome}
                          </p>
                          {r.produtor_phone ? (
                            <p className="font-mono text-[10px] text-neutral-500">
                              {r.produtor_phone}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-caption italic text-neutral-400">
                          Sem login (anônimo)
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={meta?.tone ?? "neutral"}>
                        {meta?.label ?? r.source}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-caption text-neutral-600">
                      {r.message ? (
                        <details>
                          <summary className="cursor-pointer font-medium text-milsaca-cafezal underline-offset-4 hover:underline">
                            ver
                          </summary>
                          <p className="mt-1 max-w-md rounded-md bg-neutral-50 p-2 text-[11px] text-neutral-700">
                            {r.message}
                          </p>
                        </details>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="border-t border-neutral-200 pt-4">
          <Pagination page={page} totalPages={totalPages} hrefFor={pageHref} />
        </div>
      ) : null}
    </div>
  );
}
