"use client";

import Link from "next/link";
import { QrCode, Download, Search, FileSpreadsheet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { ResponsiveTable } from "@/components/responsive-table";
import { UnidadeToggle } from "@/components/produtor/UnidadeToggle/UnidadeToggle";
import { useLocalSearchSort } from "@/hooks/use-local-search-sort";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { MeuCafeRow, ClassificacaoResumo } from "../_lib/queries";

const BRL0 = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const BRL2 = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});
const NUM = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  rascunho: { label: "Registrado", tone: "neutral" },
  aguardando_classificacao: { label: "Aguardando", tone: "warning" },
  classificado: { label: "Classificado", tone: "success" },
  fora_de_tipo: { label: "Fora de tipo", tone: "danger" },
  rebeneficiar: { label: "Rebeneficiar", tone: "warning" },
  vendido: { label: "Vendido", tone: "neutral" },
};

function specieLabel(s: string): string {
  if (s === "arabica") return "Arábica";
  if (s === "conillon" || s === "conilon") return "Conilón";
  return s;
}
function statusInfo(s: string) {
  return STATUS[s] ?? { label: s, tone: "neutral" as StatusTone };
}

type SortKey = "recente" | "valor" | "peso" | "codigo";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recente", label: "Mais recente" },
  { key: "valor", label: "Maior valor" },
  { key: "peso", label: "Mais sacas" },
  { key: "codigo", label: "Código" },
];

const columns = [
  { key: "cafe", label: "Café" },
  { key: "peso", label: "Quantidade" },
  { key: "status", label: "Status" },
  { key: "class", label: "Classificação (por corretora)" },
  { key: "valor", label: "Valor estimado", align: "right" as const },
  { key: "acoes", label: "", align: "right" as const },
];

function classToStr(lista: ClassificacaoResumo[]): string {
  if (lista.length === 0) return "Aguardando classificação";
  return lista
    .map((c) => {
      const r = c.fora_de_tipo
        ? "Fora de tipo"
        : `${c.bebida ?? "—"}${c.tipo ? ` Tipo ${c.tipo}` : ""}`;
      return `${r} (${c.corretora_nome ?? "corretora"})`;
    })
    .join("; ");
}

function csvEscape(v: string): string {
  return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function baixarCsv(rows: MeuCafeRow[]) {
  const head = [
    "Código",
    "Espécie",
    "Processo",
    "Safra",
    "Status",
    "Sacas",
    "Kg",
    "Classificações",
    "Valor estimado (R$)",
  ];
  const linhas = rows.map((r) =>
    [
      r.codigo,
      specieLabel(r.specie),
      r.processo ?? "",
      r.safra ?? "",
      statusInfo(r.status).label,
      NUM.format(r.pesoSacas),
      NUM.format(r.pesoKg),
      classToStr(r.classificacoes),
      r.valorEstimado != null ? NUM.format(r.valorEstimado) : "",
    ]
      .map((c) => csvEscape(String(c)))
      .join(";"),
  );
  // BOM pro Excel pt-BR abrir os acentos corretos.
  const csv = "﻿" + [head.join(";"), ...linhas].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "meu-cafe.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function MeuCafeView({ rows }: { rows: MeuCafeRow[] }) {
  const [status, setStatus] = useState<string>("");

  const { query, setQuery, sort, setSort, filtered } = useLocalSearchSort<
    MeuCafeRow,
    SortKey
  >(
    rows,
    {
      initialSort: "recente",
      searchFields: (r) => [
        r.codigo,
        specieLabel(r.specie),
        r.safra,
        ...r.classificacoes.map((c) => c.corretora_nome),
      ],
      filter: (r) => (status ? r.status === status : true),
      compare: (a, b, key) => {
        if (key === "valor") return (b.valorEstimado ?? 0) - (a.valorEstimado ?? 0);
        if (key === "peso") return b.pesoSacas - a.pesoSacas;
        if (key === "codigo") return a.codigo.localeCompare(b.codigo, "pt-BR");
        return b.createdAt.localeCompare(a.createdAt); // recente
      },
    },
    [status],
  );

  // Status presentes nos dados (pra montar as pills sem opções vazias).
  const statusPresentes = Array.from(new Set(rows.map((r) => r.status)));

  return (
    <div className="space-y-4">
      {/* Toolbar: busca · filtro de status · ordenar · CSV */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por código, café, corretora…"
            className="w-full rounded-md border border-neutral-200 bg-white py-2 pl-9 pr-3 text-body-sm text-milsaca-cafezal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-body-sm text-milsaca-cafezal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          {SORTS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => baixarCsv(filtered)}
          disabled={filtered.length === 0}
        >
          <FileSpreadsheet className="mr-1.5 h-4 w-4" />
          Baixar CSV
        </Button>
      </div>

      {statusPresentes.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatus("")}
            className={cn(
              "rounded-pill px-3 py-1 text-caption font-medium transition-colors",
              status === ""
                ? "bg-milsaca-cafezal text-milsaca-cream"
                : "border border-neutral-200 text-neutral-600 hover:border-milsaca-dourado",
            )}
          >
            Todos
          </button>
          {statusPresentes.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatus(st)}
              className={cn(
                "rounded-pill px-3 py-1 text-caption font-medium transition-colors",
                status === st
                  ? "bg-milsaca-cafezal text-milsaca-cream"
                  : "border border-neutral-200 text-neutral-600 hover:border-milsaca-dourado",
              )}
            >
              {statusInfo(st).label}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="py-8 text-center text-body-sm text-neutral-600">
            Nenhum lote encontrado com esse filtro.
          </CardContent>
        </Card>
      ) : (
        <ResponsiveTable<MeuCafeRow>
          columns={columns}
          rows={filtered}
          keyFor={(r) => r.id}
          renderRow={(r) => {
            const st = statusInfo(r.status);
            return (
              <>
                <td className="px-5 py-3 align-top">
                  <p className="font-mono text-caption text-milsaca-dourado-texto">
                    {r.codigo}
                  </p>
                  <p className="mt-0.5 font-medium text-milsaca-cafezal">
                    {specieLabel(r.specie)}
                    {r.processo ? ` · ${r.processo}` : ""}
                    {r.safra ? ` · ${r.safra}` : ""}
                  </p>
                </td>
                <td className="px-5 py-3 align-top">
                  <UnidadeToggle
                    valorKg={r.pesoKg}
                    pesoPorBagKg={r.pesoPorBagKg ?? undefined}
                  />
                </td>
                <td className="px-5 py-3 align-top">
                  <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                </td>
                <td className="px-5 py-3 align-top">
                  <Classificacoes lista={r.classificacoes} />
                </td>
                <td className="px-5 py-3 text-right align-top">
                  {r.valorEstimado != null ? (
                    <>
                      <p className="font-semibold text-milsaca-cafezal">
                        {BRL0.format(r.valorEstimado)}
                      </p>
                      <p className="text-caption text-neutral-500">
                        {r.precoSaca != null ? `${BRL2.format(r.precoSaca)}/saca` : ""}
                      </p>
                    </>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right align-top">
                  <AcoesLaudo lista={r.classificacoes} />
                </td>
              </>
            );
          }}
          renderCard={(r) => {
            const st = statusInfo(r.status);
            return (
              <Card>
                <CardContent className="space-y-3 p-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-caption text-milsaca-dourado-texto">
                        {r.codigo}
                      </p>
                      <p className="mt-0.5 text-body-sm font-medium text-milsaca-cafezal">
                        {specieLabel(r.specie)}
                        {r.processo ? ` · ${r.processo}` : ""}
                        {r.safra ? ` · ${r.safra}` : ""}
                      </p>
                    </div>
                    <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                  </div>

                  <UnidadeToggle
                    valorKg={r.pesoKg}
                    pesoPorBagKg={r.pesoPorBagKg ?? undefined}
                  />

                  <div className="rounded-md bg-milsaca-cream/60 px-3 py-2">
                    <p className="text-caption text-neutral-500">
                      Valor estimado{" "}
                      {r.precoSaca != null ? `· ${BRL2.format(r.precoSaca)}/saca` : ""}
                    </p>
                    <p className="text-body font-bold text-milsaca-cafezal">
                      {r.valorEstimado != null ? BRL0.format(r.valorEstimado) : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-caption font-medium text-neutral-500">
                      Classificação por corretora
                    </p>
                    <Classificacoes lista={r.classificacoes} />
                  </div>

                  <AcoesLaudo lista={r.classificacoes} />
                </CardContent>
              </Card>
            );
          }}
        />
      )}
    </div>
  );
}

function Classificacoes({ lista }: { lista: ClassificacaoResumo[] }) {
  if (lista.length === 0) {
    return (
      <span className="text-caption text-neutral-500">
        Aguardando classificação
      </span>
    );
  }
  return (
    <ul className="space-y-1">
      {lista.map((c) => (
        <li key={c.id} className="text-caption">
          <span className="font-medium text-milsaca-cafezal">
            {c.fora_de_tipo
              ? "Fora de tipo"
              : `${c.bebida ?? "—"}${c.tipo ? ` · Tipo ${c.tipo}` : ""}`}
          </span>
          <span className="text-neutral-500"> — {c.corretora_nome ?? "corretora"}</span>
        </li>
      ))}
    </ul>
  );
}

function AcoesLaudo({ lista }: { lista: ClassificacaoResumo[] }) {
  if (lista.length === 0) return <span className="text-neutral-300">—</span>;
  const ultima = lista[0]!;
  return (
    <div className="flex justify-end gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`/laudos/${ultima.id}`} target="_blank">
          <QrCode className="mr-1 h-3.5 w-3.5" />
          Laudo
        </Link>
      </Button>
      <Button asChild variant="primary" size="sm">
        <Link href={`/laudos/${ultima.id}/pdf`} target="_blank">
          <Download className="mr-1 h-3.5 w-3.5" />
          PDF
        </Link>
      </Button>
    </div>
  );
}
