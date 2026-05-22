// Indicadores ao vivo — versão mobile.
// Lê market_quotes via supabase client e mostra cards com a paleta Milsaca.
// Equivalente ao componente <IndicadoresLive /> do web em apps/web/src/components.

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { supabase } from "../lib/supabase";

type MarketQuote = {
  source: string;
  symbol: string;
  price_brl_cents: number | null;
  price_usd_cents: number | null;
  variation_pct: number | string | null;
  quoted_at: string;
  fetched_at: string;
};

// Conversão NY (US¢/lb) → R$/saca de 60kg.
// 1 lb = 0.45359237 kg → 60 kg/saca / 0.45359237 = 132.27735731 lb/saca.
const LB_PER_SACA_60KG = 132.27735731;

type Indicador = {
  key: string;
  label: string;
  sublabel: string;
  source: string;
  symbol: string;
  format: (q: MarketQuote, ctx: { usdBrl: number | null }) => {
    primary: string;
    secondary?: string;
  } | null;
};

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
    sublabel: "Bica corrida · R$/saca 60kg",
    source: "cepea_esalq",
    symbol: "arabica_bica_corrida_esalq",
    format: (q) =>
      q.price_brl_cents != null
        ? { primary: BRL.format(q.price_brl_cents / 100) }
        : null,
  },
  {
    key: "cepea-conilon",
    label: "Conilon CEPEA",
    sublabel: "Espírito Santo · R$/saca 60kg",
    source: "cepea_esalq",
    symbol: "conilon_es_esalq",
    format: (q) =>
      q.price_brl_cents != null
        ? { primary: BRL.format(q.price_brl_cents / 100) }
        : null,
  },
  {
    key: "ice-arabica",
    label: "Café NY (KC)",
    sublabel: "ICE futuros · US¢/lb",
    source: "ice_us",
    symbol: "KC.F",
    format: (q, ctx) => {
      if (q.price_usd_cents == null) return null;
      const centsPerLb = q.price_usd_cents / 100;
      const primary = `${centsPerLb.toFixed(2)} ¢/lb`;
      if (ctx.usdBrl == null) return { primary };
      const brlPerSaca =
        (centsPerLb / 100) * LB_PER_SACA_60KG * ctx.usdBrl;
      return { primary, secondary: `≈ ${BRL.format(brlPerSaca)}/saca` };
    },
  },
  {
    key: "ptax",
    label: "USD / BRL",
    sublabel: "PTAX venda · BCB",
    source: "bcb_ptax",
    symbol: "USDBRL",
    format: (q) =>
      q.price_brl_cents != null
        ? { primary: BRL_PTAX.format(q.price_brl_cents / 100) }
        : null,
  },
];

function fmtAge(iso: string): string {
  const diffMin = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${Math.floor(diffMin)} min`;
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)} h`;
  return `${Math.floor(diffMin / 60 / 24)} d`;
}

export function IndicadoresLive() {
  const [quotes, setQuotes] = useState<Map<string, MarketQuote> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("market_quotes")
        .select(
          "source, symbol, price_brl_cents, price_usd_cents, variation_pct, quoted_at, fetched_at",
        );
      if (err) throw err;
      const map = new Map<string, MarketQuote>();
      for (const r of (data ?? []) as MarketQuote[]) {
        map.set(`${r.source}/${r.symbol}`, r);
      }
      setQuotes(map);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro ao carregar indicadores",
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <View className="mt-6 rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-4">
        <Text
          className="text-xs text-red-300"
          style={{ fontFamily: "Inter_500Medium" }}
        >
          {error}
        </Text>
      </View>
    );
  }

  if (!quotes) {
    return (
      <View className="mt-6 items-center py-6">
        <ActivityIndicator color="#C9A961" />
      </View>
    );
  }

  // PTAX usado pra conversão de NY → R$/saca
  const ptax = quotes.get("bcb_ptax/USDBRL");
  const usdBrl =
    ptax?.price_brl_cents != null ? ptax.price_brl_cents / 100 : null;

  return (
    <View className="mt-6">
      <Text
        className="text-xs text-milsaca-dourado"
        style={{ fontFamily: "Inter_500Medium" }}
      >
        INDICADORES AO VIVO
      </Text>
      <View className="mt-2 gap-3">
        {INDICADORES.map((ind) => {
          const q = quotes.get(`${ind.source}/${ind.symbol}`);
          return (
            <IndicadorCard
              key={ind.key}
              indicador={ind}
              quote={q ?? null}
              usdBrl={usdBrl}
            />
          );
        })}
      </View>
    </View>
  );
}

function IndicadorCard({
  indicador,
  quote,
  usdBrl,
}: {
  indicador: Indicador;
  quote: MarketQuote | null;
  usdBrl: number | null;
}) {
  if (!quote) {
    return (
      <View className="rounded-2xl border border-dashed border-milsaca-dourado/20 bg-transparent p-4">
        <Text
          className="text-xs text-milsaca-cream"
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          {indicador.label}
        </Text>
        <Text
          className="mt-0.5 text-[11px] text-milsaca-cream/50"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          {indicador.sublabel}
        </Text>
        <Text
          className="mt-2 text-xs italic text-milsaca-cream/60"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          Aguardando primeira sincronização
        </Text>
      </View>
    );
  }

  const formatted = indicador.format(quote, { usdBrl });
  const variation =
    quote.variation_pct != null ? Number(quote.variation_pct) : null;
  const up = variation != null && variation >= 0;

  return (
    <View className="rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text
            className="text-sm text-milsaca-cream"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {indicador.label}
          </Text>
          <Text
            className="mt-0.5 text-[11px] text-milsaca-cream/60"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {indicador.sublabel}
          </Text>
        </View>
        {variation !== null ? (
          <View className="flex-row items-center gap-0.5">
            <Ionicons
              name={up ? "arrow-up" : "arrow-down"}
              size={12}
              color={up ? "#86efac" : "#fda4af"}
            />
            <Text
              className="text-xs"
              style={{
                fontFamily: "Inter_500Medium",
                color: up ? "#86efac" : "#fda4af",
              }}
            >
              {up ? "+" : ""}
              {variation.toFixed(2)}%
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        className="mt-2 text-2xl text-milsaca-cream"
        style={{ fontFamily: "Inter_700Bold" }}
      >
        {formatted?.primary ?? "—"}
      </Text>
      {formatted?.secondary ? (
        <Text
          className="mt-0.5 text-xs text-milsaca-dourado"
          style={{ fontFamily: "Inter_500Medium" }}
        >
          {formatted.secondary}
        </Text>
      ) : null}
      <Text
        className="mt-0.5 text-[10px] text-milsaca-cream/50"
        style={{ fontFamily: "Inter_400Regular" }}
      >
        atualizado há {fmtAge(quote.fetched_at)}
      </Text>
    </View>
  );
}
