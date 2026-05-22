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

  // Se nenhum dado existe ainda, esconde o bloco em vez de mostrar cards vazios
  const haveAny = INDICADORES.some((i) => byKey.has(`${i.source}/${i.symbol}`));
  if (!haveAny) return null;

  const ptax = byKey.get("bcb_ptax/USDBRL");
  const usdBrl =
    ptax?.price_brl_cents != null ? ptax.price_brl_cents / 100 : null;
  const ctx: FormatCtx = { usdBrl };

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
        <Activity className="h-4 w-4" />
        Indicadores ao vivo
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {INDICADORES.map((ind) => {
          const q = byKey.get(`${ind.source}/${ind.symbol}`);
          return (
            <IndicadorCard
              key={ind.key}
              indicador={ind}
              quote={q ?? null}
              ctx={ctx}
            />
          );
        })}
      </div>
    </section>
  );
}

function IndicadorCard({
  indicador,
  quote,
  ctx,
}: {
  indicador: Indicador;
  quote: MarketQuote | null;
  ctx: FormatCtx;
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
          <p className="text-sm text-milsaca-verde-claro">
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
    <Card className="border-milsaca-cream-escuro">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-semibold text-milsaca-verde">
            {indicador.label}
          </CardTitle>
          <CardDescription className="text-xs">
            {indicador.sublabel}
          </CardDescription>
        </div>
        {variation !== null ? (
          <span
            className={
              up
                ? "flex items-center gap-0.5 text-xs font-medium text-emerald-700"
                : "flex items-center gap-0.5 text-xs font-medium text-rose-700"
            }
          >
            <Arrow className="h-3.5 w-3.5" />
            {up ? "+" : ""}
            {variation.toFixed(2)}%
          </span>
        ) : null}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight text-milsaca-verde">
          {formatted?.primary ?? "—"}
        </p>
        {formatted?.secondary ? (
          <p className="mt-0.5 text-xs font-medium text-milsaca-dourado">
            {formatted.secondary}
          </p>
        ) : null}
        <p className="mt-1 flex items-center gap-2 text-[11px] text-milsaca-verde-claro/80">
          <span>atualizado há {fmtAge(quote.fetched_at)}</span>
          {stale ? (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
              desatualizado
            </span>
          ) : null}
          {indicador.externalUrl ? (
            <a
              href={indicador.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-milsaca-dourado hover:underline"
            >
              fonte ↗
            </a>
          ) : null}
        </p>
      </CardContent>
    </Card>
  );
}
