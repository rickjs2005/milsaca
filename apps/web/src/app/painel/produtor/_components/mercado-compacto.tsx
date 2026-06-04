// Mercado compacto — versão enxuta dos indicadores de mercado pra coluna
// lateral estreita da Início do produtor. Server component (sem "use client"):
// recebe os indicadores já carregados por loadProdutorCotacoes e só renderiza.
// Os nomes são curtos de propósito ("Bolsa NY · ICE" em vez de
// "Bolsa de Nova York (ICE)") pra não quebrar em coluna estreita.

import { Activity, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import type { MarketIndicator } from "../cotacoes/_lib/queries";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Nome curto por symbol — caber em coluna estreita sem quebrar linha.
const NOME_CURTO: Record<string, string> = {
  arabica_bica_corrida_esalq: "Arábica · CEPEA",
  conilon_es_esalq: "Conilón · CEPEA",
  "KC.F": "Bolsa NY · ICE",
  USDBRL: "Dólar · PTAX",
};

function nomeCurto(ind: MarketIndicator): string {
  return NOME_CURTO[ind.symbol] ?? ind.label;
}

function formatValor(ind: MarketIndicator): string {
  if (ind.price == null) return "—";
  if (ind.currency === "USD") return `${ind.price.toFixed(2)} ¢/lb`;
  return BRL.format(ind.price);
}

export function MercadoCompacto({ market }: { market: MarketIndicator[] }) {
  const rows = market.filter((m) => m.price != null);
  if (rows.length === 0) return null;

  // Mais recente da lista pro rodapé (fallback no primeiro item).
  const latest = rows.reduce((acc, cur) => {
    if (!acc.fetched_at) return cur;
    if (!cur.fetched_at) return acc;
    return cur.fetched_at > acc.fetched_at ? cur : acc;
  }, rows[0]!);
  const algumDesatualizado = rows.some((m) => m.stale);

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-neutral-600">
        <Activity className="h-3.5 w-3.5" aria-hidden="true" />
        Mercado
      </h2>

      <Card>
        <CardContent className="divide-y divide-neutral-100 p-0">
          {rows.map((ind) => {
            const variation = ind.variation_pct;
            const up = variation != null && variation >= 0;
            const Arrow = up ? ArrowUpRight : ArrowDownRight;

            return (
              <div
                key={`${ind.source}|${ind.symbol}`}
                className="flex items-center justify-between gap-2 px-3 py-2.5"
              >
                <span className="text-body-sm font-medium text-milsaca-cafezal">
                  {nomeCurto(ind)}
                </span>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-body-sm font-semibold text-milsaca-cafezal">
                    {formatValor(ind)}
                  </span>
                  {variation != null ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 text-caption font-semibold",
                        up ? "text-success-700" : "text-danger-700",
                      )}
                    >
                      <Arrow className="h-3.5 w-3.5" aria-hidden="true" />
                      {up ? "+" : ""}
                      {variation.toFixed(2)}%
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="flex items-center gap-1.5 text-caption text-neutral-600">
        <span>Referência · atualizado {timeAgo(latest.fetched_at)}</span>
        {algumDesatualizado ? (
          <span className="text-warning-700">· desatualizado</span>
        ) : null}
      </p>
    </section>
  );
}
