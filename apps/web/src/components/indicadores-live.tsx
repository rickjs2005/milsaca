// Componente Server que lê de public.market_quotes e mostra indicadores
// "ao vivo" (atualizados via edge function sync-cotacoes — pg_cron 21:00 UTC
// dias úteis). Compartilhado entre painéis corretora e produtor.

import { ArrowDownRight, ArrowUpRight, Activity } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@milsaca/db/web/server";
import { loadMarketTrend, type MarketTrend } from "@/lib/market-trend";
import { Sparkline } from "@/components/sparkline";
import { cn } from "@/lib/utils";

type MarketQuote = {
  source: string;
  symbol: string;
  price_brl_cents: number | null;
  price_usd_cents: number | null;
  variation_pct: number | string | null;
  quoted_at: string;
  fetched_at: string;
  source_url: string | null;
};

type FormatCtx = { usdBrl: number | null };

type Indicador = {
  key: string;
  label: string;
  sublabel: string;
  source: string;
  symbol: string;
  format: (
    q: MarketQuote,
    ctx: FormatCtx,
  ) => { primary: string; secondary?: string } | null;
  externalUrl?: string;
};

// 1 saca de 60kg = 132.27735731 libras (1 lb = 0.45359237 kg)
const LB_PER_SACA_60KG = 132.27735731;

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const BRL_PTAX = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 4,
});

const INDICADORES: Indicador[] = [
  {
    key: "cepea-arabica",
    label: "Arábica CEPEA",
    sublabel: "Bica corrida, R$/saca 60kg",
    source: "cepea_esalq",
    symbol: "arabica_bica_corrida_esalq",
    format: (q) =>
      q.price_brl_cents != null
        ? { primary: BRL.format(q.price_brl_cents / 100) }
        : null,
    externalUrl:
      "https://www.cepea.esalq.usp.br/br/indicador/cafe.aspx",
  },
  {
    key: "cepea-conilon",
    label: "Conilon CEPEA",
    sublabel: "Espírito Santo, R$/saca 60kg",
    source: "cepea_esalq",
    symbol: "conilon_es_esalq",
    format: (q) =>
      q.price_brl_cents != null
        ? { primary: BRL.format(q.price_brl_cents / 100) }
        : null,
    externalUrl:
      "https://www.noticiasagricolas.com.br/cotacoes/cafe/indicador-cepea-esalq-cafe-conillon",
  },
  {
    key: "ice-arabica",
    label: "Café NY (ICE KC)",
    sublabel: "Arábica, US¢/lb",
    source: "ice_us",
    symbol: "KC.F",
    format: (q, ctx) => {
      if (q.price_usd_cents == null) return null;
      const centsPerLb = q.price_usd_cents / 100;
      const primary = `${centsPerLb.toFixed(2)} ¢/lb`;
      if (ctx.usdBrl == null) return { primary };
      const brlPerSaca = (centsPerLb / 100) * LB_PER_SACA_60KG * ctx.usdBrl;
      return { primary, secondary: `≈ ${BRL.format(brlPerSaca)}/saca` };
    },
    externalUrl: "https://finance.yahoo.com/quote/KC=F/",
  },
  {
    key: "ptax",
    label: "USD / BRL",
    sublabel: "PTAX venda, BCB",
    source: "bcb_ptax",
    symbol: "USDBRL",
    format: (q) =>
      q.price_brl_cents != null
        ? { primary: BRL_PTAX.format(q.price_brl_cents / 100) }
        : null,
    externalUrl:
      "https://www.bcb.gov.br/estabilidadefinanceira/historicocotacoes",
  },
];

function fmtAge(iso: string): string {
  const diffMin = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${Math.floor(diffMin)} min`;
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)} h`;
  return `${Math.floor(diffMin / 60 / 24)} d`;
}

function isStale(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() > 48 * 60 * 60 * 1000;
}

export async function IndicadoresLive() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("market_quotes")
    .select(
      "source, symbol, price_brl_cents, price_usd_cents, variation_pct, quoted_at, fetched_at, source_url",
    );

  const rows = (data ?? []) as MarketQuote[];
  const byKey = new Map(
    rows.map((r) => [`${r.source}/${r.symbol}`, r] as const),
  );

  const trend = await loadMarketTrend(INDICADORES.map((i) => i.symbol));

  // Se nenhum dado existe ainda, esconde o bloco em vez de mostrar cards vazios
  const haveAny = INDICADORES.some((i) => byKey.has(`${i.source}/${i.symbol}`));
  if (!haveAny) return null;

  const ptax = byKey.get("bcb_ptax/USDBRL");
  const usdBrl =
    ptax?.price_brl_cents != null ? ptax.price_brl_cents / 100 : null;
  const ctx: FormatCtx = { usdBrl };

  const nacional = INDICADORES.filter((i) => i.source === "cepea_esalq");
  const internacional = INDICADORES.filter((i) => i.source !== "cepea_esalq");
  const card = (ind: Indicador) => (
    <IndicadorCard
      key={ind.key}
      indicador={ind}
      quote={byKey.get(`${ind.source}/${ind.symbol}`) ?? null}
      ctx={ctx}
      trend={trend[ind.symbol]}
    />
  );

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-neutral-500">
        <Activity className="h-4 w-4" />
        Indicadores ao vivo
      </h2>
      {nacional.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-caption font-medium text-neutral-500">
            Mercado nacional · CEPEA/ESALQ
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">{nacional.map(card)}</div>
        </div>
      ) : null}
      {internacional.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-caption font-medium text-neutral-500">
            Mercado internacional · ICE NY e dólar
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {internacional.map(card)}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function IndicadorCard({
  indicador,
  quote,
  ctx,
  trend,
}: {
  indicador: Indicador;
  quote: MarketQuote | null;
  ctx: FormatCtx;
  trend?: MarketTrend;
}) {
  if (!quote) {
    return (
      <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs uppercase tracking-wider">
            {indicador.label}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-body-sm text-neutral-500">
            Sem dado ainda. Aguardando primeira sincronização.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatted = indicador.format(quote, ctx);
  const variation = quote.variation_pct != null ? Number(quote.variation_pct) : null;
  const up = variation != null && variation >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  const stale = isStale(quote.fetched_at);

  return (
    <Card className="border-neutral-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-label font-semibold text-milsaca-cafezal">
            {indicador.label}
          </CardTitle>
          <CardDescription className="text-caption">
            {indicador.sublabel}
          </CardDescription>
        </div>
        {variation !== null ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-pill px-2 py-0.5 text-caption font-semibold",
              up
                ? "bg-success-50 text-success-700"
                : "bg-danger-50 text-danger-700",
            )}
          >
            <Arrow className="h-3.5 w-3.5" />
            {up ? "+" : ""}
            {variation.toFixed(2)}%
          </span>
        ) : null}
      </CardHeader>
      <CardContent>
        <p className="text-h2 tracking-tight text-milsaca-cafezal">
          {formatted?.primary ?? "—"}
        </p>
        {formatted?.secondary ? (
          <p className="mt-0.5 text-caption font-medium text-milsaca-dourado-texto">
            {formatted.secondary}
          </p>
        ) : null}
        <p className="mt-1 flex items-center gap-2 text-caption text-neutral-500">
          <span>atualizado há {fmtAge(quote.fetched_at)}</span>
          {stale ? (
            <span className="rounded bg-warning-50 px-1.5 py-0.5 text-[10px] font-medium text-warning-700">
              desatualizado
            </span>
          ) : null}
          {indicador.externalUrl ? (
            <a
              href={indicador.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-milsaca-dourado-texto hover:underline"
            >
              fonte ↗
            </a>
          ) : null}
        </p>
        {trend ? (
          <span
            className={`mt-1 inline-flex items-center gap-1 text-caption font-medium ${
              trend.direction === "alta"
                ? "text-success-700"
                : trend.direction === "baixa"
                  ? "text-danger-700"
                  : "text-neutral-500"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                trend.direction === "alta"
                  ? "bg-success-500"
                  : trend.direction === "baixa"
                    ? "bg-danger-500"
                    : "bg-warning-500"
              }`}
            />
            {trend.direction === "alta"
              ? "Alta"
              : trend.direction === "baixa"
                ? "Baixa"
                : "Estável"}
            {trend.pct != null
              ? ` ${trend.pct >= 0 ? "+" : ""}${trend.pct.toFixed(1)}%`
              : ""}{" "}
            · {trend.label}
          </span>
        ) : null}
        {trend?.series && trend.series.length >= 2 ? (
          <Sparkline data={trend.series} className="mt-1 h-7 w-full text-neutral-300" />
        ) : null}
      </CardContent>
    </Card>
  );
}
