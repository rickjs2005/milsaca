"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, MessageCircle, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { FilterSheet } from "@/components/filter-sheet";
import { ResponsiveTable } from "@/components/responsive-table";
import {
  PRODUTOR_SORT_LABEL,
  PRODUTOR_STATUS_LABEL,
  PRODUTOR_STATUS_TONE,
  TIPO_FILTERS,
  detalheHref,
  formatBRL,
  produtorStatus,
  type ProdutorListItem,
  type ProdutorSortKey,
} from "../_lib/produtor-meta";
import { buildWhatsAppInviteUrl, defaultInviteMessage } from "../_lib/whatsapp";

type TipoFilter = "" | "plataforma" | "contato";

function whatsAppUrl(
  p: ProdutorListItem,
  corretoraNome: string,
  siteUrl: string,
): string | null {
  return buildWhatsAppInviteUrl({
    phone: p.phone,
    message: defaultInviteMessage({
      corretoraNome,
      produtorNome: p.full_name,
      siteUrl,
    }),
  });
}

function localLabel(p: ProdutorListItem): string | null {
  if (p.city && p.state) return `${p.city} / ${p.state}`;
  return p.city ?? p.state ?? null;
}

export function ProdutoresView({
  items,
  corretoraNome,
  siteUrl,
}: {
  items: ProdutorListItem[];
  corretoraNome: string;
  siteUrl: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ProdutorSortKey>("negocios");
  const [tipo, setTipo] = useState<TipoFilter>("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((p) => {
      if (tipo === "plataforma" && !p.na_plataforma) return false;
      if (tipo === "contato" && p.na_plataforma) return false;
      if (!q) return true;
      return [
        p.full_name,
        p.fazenda_nome ?? "",
        p.city ?? "",
        p.state ?? "",
        p.email ?? "",
        p.phone ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    return [...list].sort((a, b) => {
      if (sort === "nome") {
        return a.full_name.localeCompare(b.full_name, "pt-BR");
      }
      if (sort === "recente") {
        if (a.last_activity && b.last_activity) {
          return b.last_activity.localeCompare(a.last_activity);
        }
        if (a.last_activity) return -1;
        if (b.last_activity) return 1;
        return a.full_name.localeCompare(b.full_name, "pt-BR");
      }
      // negocios
      if (b.valor_movimentado !== a.valor_movimentado) {
        return b.valor_movimentado - a.valor_movimentado;
      }
      if (b.qtd_contratos !== a.qtd_contratos) {
        return b.qtd_contratos - a.qtd_contratos;
      }
      return a.full_name.localeCompare(b.full_name, "pt-BR");
    });
  }, [items, query, sort, tipo]);

  const count = filtered.length;
  const noun = count === 1 ? "produtor" : "produtores";

  const selectClass =
    "h-10 rounded-md border border-neutral-200 bg-white px-3 text-body-sm text-milsaca-cafezal outline-none transition-colors hover:border-milsaca-dourado focus-visible:ring-2 focus-visible:ring-ring/40";

  return (
    <div className="space-y-4">
      {/* Toolbar: busca + ordenação */}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nome, fazenda, cidade…"
            className="h-10 w-full rounded-md border border-neutral-200 bg-white pl-9 pr-3 text-body-sm text-milsaca-preto placeholder:text-neutral-400 outline-none transition-colors focus-visible:border-milsaca-dourado focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <select
          aria-label="Ordenar"
          value={sort}
          onChange={(e) => setSort(e.target.value as ProdutorSortKey)}
          className={selectClass}
        >
          {(Object.keys(PRODUTOR_SORT_LABEL) as ProdutorSortKey[]).map((k) => (
            <option key={k} value={k}>
              {PRODUTOR_SORT_LABEL[k]}
            </option>
          ))}
        </select>
      </div>

      {/* DESKTOP: pills de tipo + contagem */}
      <div className="hidden flex-wrap items-center justify-between gap-3 sm:flex">
        <div className="flex flex-wrap items-center gap-2">
          {TIPO_FILTERS.map((f) => {
            const active = tipo === f.value;
            return (
              <button
                key={f.value || "all"}
                type="button"
                onClick={() => setTipo(f.value)}
                className={cn(
                  "rounded-pill px-3 py-1 text-caption font-medium transition-colors",
                  active
                    ? "bg-milsaca-cafezal text-milsaca-cream"
                    : "border border-neutral-200 text-neutral-600 hover:border-milsaca-dourado/50 hover:text-milsaca-cafezal",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <span className="whitespace-nowrap text-caption text-neutral-500">
          <strong className="text-milsaca-cafezal">{count}</strong> {noun}
        </span>
      </div>

      {/* MOBILE: botão Filtros + contagem */}
      <div className="flex items-center justify-between gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex h-10 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 text-body-sm font-medium text-milsaca-cafezal transition-colors hover:border-milsaca-dourado focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {tipo !== "" ? (
            <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-milsaca-cafezal px-1 text-[11px] font-bold text-milsaca-cream">
              1
            </span>
          ) : null}
        </button>
        <span className="text-caption text-neutral-500">
          <strong className="text-milsaca-cafezal">{count}</strong> {noun}
        </span>
      </div>

      <ResponsiveTable<ProdutorListItem>
        columns={[
          { key: "nome", label: "Nome", align: "left" },
          { key: "contato", label: "Contato", align: "left" },
          { key: "fazenda", label: "Fazenda / Local", align: "left" },
          { key: "status", label: "Status", align: "left" },
          { key: "negocios", label: "Negócios", align: "right" },
          { key: "acoes", label: "", align: "right" },
        ]}
        rows={filtered}
        keyFor={(p) => `${p.kind}-${p.id}`}
        renderRow={(p) => {
          const href = detalheHref(p);
          const status = produtorStatus(p);
          const wa = whatsAppUrl(p, corretoraNome, siteUrl);
          const local = localLabel(p);
          return (
            <>
              <td className="px-5 py-3">
                {href ? (
                  <Link
                    href={href}
                    className="font-medium text-milsaca-cafezal hover:underline"
                  >
                    {p.full_name}
                  </Link>
                ) : (
                  <span className="font-medium text-milsaca-cafezal">
                    {p.full_name}
                  </span>
                )}
              </td>
              <td className="px-5 py-3">
                {p.email || p.phone ? (
                  <div className="space-y-0.5">
                    {p.email ? (
                      <p className="text-caption text-neutral-500">{p.email}</p>
                    ) : null}
                    {p.phone ? (
                      <p className="text-caption text-neutral-500">{p.phone}</p>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-neutral-400">—</span>
                )}
              </td>
              <td className="px-5 py-3">
                {p.fazenda_nome || local ? (
                  <div className="space-y-0.5">
                    {p.fazenda_nome ? (
                      <p className="font-medium text-milsaca-cafezal">
                        {p.fazenda_nome}
                      </p>
                    ) : null}
                    {local ? (
                      <p className="text-caption text-neutral-500">{local}</p>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-neutral-400">—</span>
                )}
              </td>
              <td className="px-5 py-3">
                <StatusBadge tone={PRODUTOR_STATUS_TONE[status]}>
                  {PRODUTOR_STATUS_LABEL[status]}
                </StatusBadge>
              </td>
              <td className="px-5 py-3 text-right">
                <p className="text-caption text-neutral-500">
                  {p.qtd_leads} leads · {p.qtd_contratos} contratos
                </p>
                {p.valor_movimentado > 0 ? (
                  <p className="mt-0.5">
                    <span className="font-semibold tabular-nums text-milsaca-cafezal">
                      {formatBRL(p.valor_movimentado)}
                    </span>
                    <span className="ml-1 text-caption font-normal text-neutral-400">
                      movimentado
                    </span>
                  </p>
                ) : null}
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center justify-end gap-3">
                  {wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-caption font-medium text-success-700 hover:underline"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  ) : (
                    <span className="text-caption text-neutral-400">
                      sem telefone
                    </span>
                  )}
                  {href ? (
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1 text-caption font-medium text-milsaca-cafezal hover:underline"
                    >
                      Ver
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </div>
              </td>
            </>
          );
        }}
        renderCard={(p) => (
          <ProducerCard
            p={p}
            corretoraNome={corretoraNome}
            siteUrl={siteUrl}
          />
        )}
      />

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        groups={[
          {
            key: "tipo",
            label: "Tipo",
            options: TIPO_FILTERS,
            value: tipo,
            onSelect: (v) => setTipo(v as TipoFilter),
          },
        ]}
        resultCount={count}
        resultNoun={noun}
        onClear={() => {
          setTipo("");
          setSheetOpen(false);
        }}
      />
    </div>
  );
}

function ProducerCard({
  p,
  corretoraNome,
  siteUrl,
}: {
  p: ProdutorListItem;
  corretoraNome: string;
  siteUrl: string;
}) {
  const href = detalheHref(p);
  const status = produtorStatus(p);
  const wa = whatsAppUrl(p, corretoraNome, siteUrl);
  const local = localLabel(p);

  return (
    <div className="rounded-card border border-neutral-200 bg-white p-card shadow-card">
      <div className="flex items-start justify-between gap-2">
        {href ? (
          <Link
            href={href}
            className="min-w-0 font-medium text-milsaca-cafezal hover:underline"
          >
            {p.full_name}
          </Link>
        ) : (
          <span className="min-w-0 font-medium text-milsaca-cafezal">
            {p.full_name}
          </span>
        )}
        <StatusBadge tone={PRODUTOR_STATUS_TONE[status]}>
          {PRODUTOR_STATUS_LABEL[status]}
        </StatusBadge>
      </div>

      {p.fazenda_nome || local ? (
        <p className="mt-1 text-caption text-neutral-500">
          {[p.fazenda_nome, local].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      {p.valor_movimentado > 0 ? (
        <p className="mt-3 text-h3 tabular-nums text-milsaca-cafezal">
          {formatBRL(p.valor_movimentado)}
          <span className="ml-1 text-caption font-normal text-neutral-400">
            movimentado
          </span>
        </p>
      ) : null}

      <p className="mt-1 text-caption text-neutral-500">
        {p.qtd_leads} leads · {p.qtd_contratos} contratos
      </p>

      <div className="mt-3 flex items-center gap-2 border-t border-neutral-100 pt-3">
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-3 text-caption font-medium text-success-700 transition-colors hover:bg-success-50"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        ) : (
          <span className="inline-flex h-9 flex-1 items-center justify-center text-caption text-neutral-400">
            sem telefone
          </span>
        )}
        {href ? (
          <Link
            href={href}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-3 text-caption font-medium text-milsaca-cafezal transition-colors hover:border-milsaca-dourado hover:bg-milsaca-cream"
          >
            Ver
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
