"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  MessageCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { FilterSheet } from "@/components/filter-sheet";
import { ResponsiveTable } from "@/components/responsive-table";
import {
  COMPRADOR_SORT_LABEL,
  STATUS_FILTERS,
  TIPO_FILTERS,
  buildBuyerWhatsAppUrl,
  compraRecencia,
  fmtCnpj,
  formatBRL,
  localLabel,
  tipoLabel,
  tipoTone,
  type CompradorListItem,
  type CompradorSortKey,
} from "../_lib/comprador-meta";

type StatusFilter = "" | "ativo" | "inativo";

const HREF = (id: string) => `/painel/corretora/compradores/${id}`;

export function CompradoresView({
  items,
  corretoraNome,
}: {
  items: CompradorListItem[];
  corretoraNome: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<CompradorSortKey>("comprado");
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const nowMs = useMemo(() => Date.now(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((c) => {
      if (tipo && c.tipo !== tipo) return false;
      if (status === "ativo" && !c.ativo) return false;
      if (status === "inativo" && c.ativo) return false;
      if (!q) return true;
      return [c.name, c.trade_name ?? "", c.cnpj ?? "", c.city ?? "", c.state ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    return [...list].sort((a, b) => {
      if (sort === "nome") return a.name.localeCompare(b.name, "pt-BR");
      if (sort === "recente") {
        const la = a.last_compra ?? "";
        const lb = b.last_compra ?? "";
        if (la !== lb) return lb.localeCompare(la);
        return a.name.localeCompare(b.name, "pt-BR");
      }
      // comprado (default)
      if (b.valor_comprado !== a.valor_comprado) {
        return b.valor_comprado - a.valor_comprado;
      }
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [items, query, sort, tipo, status]);

  const count = filtered.length;
  const noun = count === 1 ? "comprador" : "compradores";
  const filtrosAtivos = (tipo ? 1 : 0) + (status ? 1 : 0);

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
            placeholder="Buscar nome, CNPJ, cidade…"
            className="h-10 w-full rounded-md border border-neutral-200 bg-white pl-9 pr-3 text-body-sm text-milsaca-preto placeholder:text-neutral-400 outline-none transition-colors focus-visible:border-milsaca-dourado focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <select
          aria-label="Ordenar"
          value={sort}
          onChange={(e) => setSort(e.target.value as CompradorSortKey)}
          className={selectClass}
        >
          {(Object.keys(COMPRADOR_SORT_LABEL) as CompradorSortKey[]).map((k) => (
            <option key={k} value={k}>
              {COMPRADOR_SORT_LABEL[k]}
            </option>
          ))}
        </select>
      </div>

      {/* DESKTOP: pills tipo + status + contagem */}
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
          <span className="mx-1 h-4 w-px bg-neutral-200" />
          {STATUS_FILTERS.filter((f) => f.value).map((f) => {
            const active = status === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatus(active ? "" : f.value)}
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
          {filtrosAtivos > 0 ? (
            <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-milsaca-cafezal px-1 text-[11px] font-bold text-milsaca-cream">
              {filtrosAtivos}
            </span>
          ) : null}
        </button>
        <span className="text-caption text-neutral-500">
          <strong className="text-milsaca-cafezal">{count}</strong> {noun}
        </span>
      </div>

      <ResponsiveTable<CompradorListItem>
        columns={[
          { key: "nome", label: "Nome", align: "left" },
          { key: "cnpj", label: "CNPJ", align: "left" },
          { key: "cidade", label: "Cidade", align: "left" },
          { key: "tipo", label: "Tipo", align: "left" },
          { key: "negocios", label: "Negócios", align: "right" },
          { key: "acoes", label: "", align: "right" },
        ]}
        rows={filtered}
        keyFor={(c) => c.id}
        rowClassName={(c) => (c.ativo ? undefined : "opacity-60")}
        renderRow={(c) => {
          const rec = compraRecencia(c.last_compra, nowMs);
          const wa = buildBuyerWhatsAppUrl({
            phone: c.contact_phone,
            compradorNome: c.trade_name ?? c.name,
            corretoraNome,
          });
          const local = localLabel(c);
          return (
            <>
              <td className="px-5 py-3">
                <Link
                  href={HREF(c.id)}
                  className="font-medium text-milsaca-cafezal hover:underline"
                >
                  {c.name}
                </Link>
                {c.trade_name ? (
                  <p className="text-caption text-neutral-500">{c.trade_name}</p>
                ) : null}
              </td>
              <td className="px-5 py-3 font-mono text-caption text-neutral-500">
                {fmtCnpj(c.cnpj)}
              </td>
              <td className="px-5 py-3 text-body-sm text-neutral-600">
                {local ?? "—"}
              </td>
              <td className="px-5 py-3">
                {c.tipo ? (
                  <StatusBadge tone={tipoTone(c.tipo)}>
                    {tipoLabel(c.tipo)}
                  </StatusBadge>
                ) : (
                  <span className="text-neutral-400">—</span>
                )}
                {!c.ativo ? (
                  <span className="ml-1 align-middle text-caption text-neutral-400">
                    Inativo
                  </span>
                ) : null}
              </td>
              <td className="px-5 py-3 text-right">
                <p className="text-caption text-neutral-500">
                  {c.qtd_contratos}{" "}
                  {c.qtd_contratos === 1 ? "contrato" : "contratos"}
                  {c.valor_comprado > 0 ? (
                    <>
                      {" · "}
                      <span className="font-semibold tabular-nums text-milsaca-cafezal">
                        {formatBRL(c.valor_comprado)}
                      </span>
                    </>
                  ) : null}
                </p>
                {rec ? (
                  <p
                    className={cn(
                      "mt-0.5 inline-flex items-center gap-1 text-caption",
                      rec.warn ? "text-warning-700" : "text-neutral-400",
                    )}
                  >
                    {rec.warn ? <AlertTriangle className="h-3 w-3" /> : null}
                    {rec.label}
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
                  <Link
                    href={HREF(c.id)}
                    className="inline-flex items-center gap-1 text-caption font-medium text-milsaca-cafezal hover:underline"
                  >
                    Abrir
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </td>
            </>
          );
        }}
        renderCard={(c) => (
          <BuyerCard c={c} corretoraNome={corretoraNome} nowMs={nowMs} />
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
            onSelect: setTipo,
          },
          {
            key: "status",
            label: "Status",
            options: STATUS_FILTERS,
            value: status,
            onSelect: (v) => setStatus(v as StatusFilter),
          },
        ]}
        resultCount={count}
        resultNoun={noun}
        onClear={() => {
          setTipo("");
          setStatus("");
          setSheetOpen(false);
        }}
      />
    </div>
  );
}

function BuyerCard({
  c,
  corretoraNome,
  nowMs,
}: {
  c: CompradorListItem;
  corretoraNome: string;
  nowMs: number;
}) {
  const rec = compraRecencia(c.last_compra, nowMs);
  const wa = buildBuyerWhatsAppUrl({
    phone: c.contact_phone,
    compradorNome: c.trade_name ?? c.name,
    corretoraNome,
  });
  const local = localLabel(c);

  return (
    <div
      className={cn(
        "rounded-card border border-neutral-200 bg-white p-card shadow-card",
        !c.ativo && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={HREF(c.id)}
          className="min-w-0 font-medium text-milsaca-cafezal hover:underline"
        >
          {c.name}
        </Link>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {c.tipo ? (
            <StatusBadge tone={tipoTone(c.tipo)}>{tipoLabel(c.tipo)}</StatusBadge>
          ) : null}
          <StatusBadge tone={c.ativo ? "success" : "neutral"}>
            {c.ativo ? "Ativo" : "Inativo"}
          </StatusBadge>
        </div>
      </div>

      {c.cnpj ? (
        <p className="mt-1 font-mono text-caption text-neutral-500">
          {fmtCnpj(c.cnpj)}
        </p>
      ) : null}
      {local ? (
        <p className="mt-0.5 text-caption text-neutral-500">{local}</p>
      ) : null}

      {c.valor_comprado > 0 ? (
        <p className="mt-3 text-h3 tabular-nums text-milsaca-cafezal">
          {formatBRL(c.valor_comprado)}
          <span className="ml-1 text-caption font-normal text-neutral-400">
            comprado
          </span>
        </p>
      ) : null}

      <p className="mt-1 text-caption text-neutral-500">
        {c.qtd_contratos} {c.qtd_contratos === 1 ? "contrato" : "contratos"}
      </p>
      {rec ? (
        <p
          className={cn(
            "mt-0.5 inline-flex items-center gap-1 text-caption",
            rec.warn ? "text-warning-700" : "text-neutral-400",
          )}
        >
          {rec.warn ? <AlertTriangle className="h-3 w-3" /> : null}
          {rec.label}
        </p>
      ) : null}

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
        <Link
          href={HREF(c.id)}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-3 text-caption font-medium text-milsaca-cafezal transition-colors hover:border-milsaca-dourado hover:bg-milsaca-cream"
        >
          Abrir
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
