// Tela Cotações — separação visual Mercado / Minhas corretoras / Outras praças.
// Paridade com /painel/produtor/cotacoes do web.

import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Sparkline } from "../../src/components/Sparkline";
import { useAuth } from "../../src/lib/auth";
import {
  loadProdutorCotacoesMobile,
  type CotacaoCard,
  type FavoritaSemCotacao,
  type MarketIndicator,
  type ProdutorCotacoesMobile,
} from "../../src/lib/queries";
import { buildWhatsAppUrl } from "../../src/lib/whatsapp";
import type { CoffeeSpecie } from "@milsaca/types";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});
const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const SPECIES: { value: CoffeeSpecie | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "arabica", label: "Arábica" },
  { value: "conillon", label: "Conillón" },
];

const PROCESS_LABEL: Record<string, string> = {
  natural: "Natural",
  cereja_descascado: "Cereja descascado",
  cd_desmucilado: "CD desmucilado",
  despolpado: "Despolpado",
  fermentacao_induzida: "Fermentação induzida",
};

const SPECIE_LABEL: Record<string, string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};

function fmtDate(iso: string) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function timeAgo(iso: string): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "agora";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `há ${days}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function CotacoesScreen() {
  const { profile } = useAuth();
  const produtorNome = profile?.full_name ?? null;
  const [data, setData] = useState<ProdutorCotacoesMobile | null>(null);
  const [filter, setFilter] = useState<CoffeeSpecie | "all">("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    const next = await loadProdutorCotacoesMobile(
      profile.id,
      filter === "all" ? {} : { specie: filter },
    );
    setData(next);
  }, [filter, profile?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-milsaca-cream">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2D3A2E" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-milsaca-cream">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2D3A2E"
          />
        }
      >
        <DemoBadgeMobile />
        <View>
          <Text
            className="text-2xl text-milsaca-verde"
            style={{ fontFamily: "Inter_700Bold" }}
          >
            Cotações
          </Text>
          <Text
            className="mt-1 text-xs text-milsaca-verde-claro"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            Mercado + corretoras que você acompanha.
          </Text>
        </View>

        {/* Filtro espécie */}
        <View className="flex-row flex-wrap gap-2">
          {SPECIES.map((s) => {
            const active = filter === s.value;
            return (
              <Pressable
                key={s.value}
                onPress={() => setFilter(s.value)}
                className={
                  active
                    ? "rounded-full bg-milsaca-verde px-3 py-1.5"
                    : "rounded-full border border-milsaca-cream-escuro px-3 py-1.5"
                }
              >
                <Text
                  className={
                    active
                      ? "text-xs text-milsaca-cream"
                      : "text-xs text-milsaca-verde-claro"
                  }
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Seção 1: Mercado */}
        <View style={{ gap: 8 }}>
          <View className="flex-row items-center gap-2">
            <Ionicons name="pulse" size={16} color="#C9A961" />
            <Text
              className="text-base text-milsaca-verde"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              Mercado
            </Text>
          </View>
          <View style={{ gap: 8 }}>
            {data.market.map((m) => (
              <MarketCard key={`${m.source}-${m.symbol}`} m={m} />
            ))}
          </View>
          <Text
            className="text-[10px] text-milsaca-verde-claro/80"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            Robusta/Conilon de mercado: fonte automática indisponível.
            Veja cotações manuais das corretoras abaixo.
          </Text>
        </View>

        {/* Seção 2: Minhas corretoras */}
        <View style={{ gap: 8 }}>
          <View className="flex-row items-center gap-2">
            <Ionicons name="star" size={16} color="#C9A961" />
            <Text
              className="text-base text-milsaca-verde"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              Minhas corretoras
              {data.minhasCorretoras.length + data.favoritasSemCotacao.length >
              0
                ? ` (${
                    data.minhasCorretoras.length +
                    data.favoritasSemCotacao.length
                  })`
                : ""}
            </Text>
          </View>
          {data.minhasCorretoras.length === 0 &&
          data.favoritasSemCotacao.length === 0 ? (
            <Pressable
              onPress={() => router.push("/(painel)/corretoras")}
              className="items-center gap-2 rounded-2xl border border-milsaca-dourado/30 bg-milsaca-dourado/5 p-6 active:opacity-80"
            >
              <Ionicons name="star-outline" size={28} color="#C9A961" />
              <Text
                className="text-sm text-milsaca-verde"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                Sem corretoras favoritas ainda
              </Text>
              <Text
                className="text-center text-xs text-milsaca-verde-claro"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                Toque aqui pra abrir o catálogo e favoritar uma corretora.
              </Text>
            </Pressable>
          ) : (
            <View style={{ gap: 12 }}>
              {data.minhasCorretoras.map((c) => (
                <CotacaoCardView key={c.key} c={c} accent />
              ))}
              {data.favoritasSemCotacao.map((c) => (
                <FavoritaSemCotacaoCard
                  key={c.id}
                  c={c}
                  produtorNome={produtorNome}
                />
              ))}
            </View>
          )}
        </View>

        {/* Seção 3: Outras praças */}
        {data.outrasPracas.length > 0 ? (
          <View style={{ gap: 8 }}>
            <View className="flex-row items-center gap-2">
              <Ionicons name="location" size={16} color="#C9A961" />
              <Text
                className="text-base text-milsaca-verde"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Outras praças ({data.outrasPracas.length})
              </Text>
            </View>
            <View style={{ gap: 12 }}>
              {data.outrasPracas.map((c) => (
                <CotacaoCardView key={c.key} c={c} />
              ))}
            </View>
          </View>
        ) : null}

        {data.minhasCorretoras.length === 0 &&
        data.outrasPracas.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-dashed border-milsaca-cream-escuro p-6">
            <Ionicons name="cafe-outline" size={28} color="#4A5C4C" />
            <Text
              className="text-sm text-milsaca-verde"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              Sem cotações disponíveis ainda.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function MarketCard({ m }: { m: MarketIndicator }) {
  const fmtFn = m.currency === "USD" ? USD : BRL;
  const up = m.variation_pct != null && m.variation_pct > 0.001;
  const down = m.variation_pct != null && m.variation_pct < -0.001;
  return (
    <View
      className={
        m.stale
          ? "rounded-2xl border border-amber-200 bg-amber-50/60 p-4"
          : "rounded-2xl border border-milsaca-cream-escuro bg-white p-4"
      }
    >
      <Text
        className="text-sm text-milsaca-verde"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {m.label}
      </Text>
      <Text
        className="mt-0.5 text-[11px] text-milsaca-verde-claro"
        style={{ fontFamily: "Inter_400Regular" }}
      >
        {m.sublabel}
      </Text>

      {m.price == null ? (
        <Text
          className="mt-2 text-sm italic text-amber-700"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          Fonte automática indisponível
        </Text>
      ) : (
        <>
          <View className="mt-2 flex-row items-baseline gap-2">
            <Text
              className="text-xl text-milsaca-verde"
              style={{ fontFamily: "Inter_700Bold" }}
            >
              {fmtFn.format(m.price)}
            </Text>
            {m.variation_pct != null ? (
              <Text
                className={
                  up
                    ? "text-xs text-emerald-700"
                    : down
                      ? "text-xs text-rose-700"
                      : "text-xs text-milsaca-verde-claro"
                }
                style={{ fontFamily: "Inter_500Medium" }}
              >
                {m.variation_pct > 0 ? "+" : ""}
                {m.variation_pct.toFixed(2)}%
              </Text>
            ) : null}
          </View>
          <Text
            className={
              m.stale
                ? "mt-1 text-[10px] text-amber-700"
                : "mt-1 text-[10px] text-milsaca-verde-claro"
            }
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {m.stale ? "Desatualizado · " : ""}
            {timeAgo(m.fetched_at)}
          </Text>
        </>
      )}
    </View>
  );
}

function CotacaoCardView({ c, accent }: { c: CotacaoCard; accent?: boolean }) {
  const v = c.variacao_pct;
  const up = v != null && v > 0.001;
  const down = v != null && v < -0.001;
  const sparkColor = up ? "#047857" : down ? "#be123c" : "#2D3A2E";
  const stale = c.status === "stale";

  return (
    <View
      className={
        accent
          ? "rounded-2xl border border-milsaca-dourado/40 bg-milsaca-dourado/5 p-4"
          : "rounded-2xl border border-milsaca-cream-escuro bg-white p-4"
      }
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text
            className="text-base text-milsaca-verde"
            style={{ fontFamily: "Inter_700Bold" }}
          >
            {c.specie ? SPECIE_LABEL[c.specie] : c.coffee_type}
          </Text>
          <Text
            className="mt-0.5 text-[11px] text-milsaca-verde-claro"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {c.process ? PROCESS_LABEL[c.process] : "Sem processo"}
            {c.region ? ` · ${c.region}` : ""}
          </Text>
        </View>
        <Sparkline series={c.series} color={sparkColor} />
      </View>

      <View className="mt-2 flex-row items-baseline justify-between gap-2">
        <Text
          className="text-2xl text-milsaca-verde"
          style={{ fontFamily: "Inter_700Bold" }}
        >
          {BRL.format(c.current_price)}
        </Text>
        {v != null ? (
          <Text
            className={
              up
                ? "text-sm text-emerald-700"
                : down
                  ? "text-sm text-rose-700"
                  : "text-sm text-milsaca-verde-claro"
            }
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {v > 0 ? "+" : ""}
            {v.toFixed(2)}%
          </Text>
        ) : null}
      </View>

      <View className="mt-2 flex-row flex-wrap gap-3 border-t border-milsaca-cream-escuro/60 pt-2">
        <Janela label="dia" value={c.variacao_pct} />
        <Janela label="7d" value={c.variacao_7d_pct ?? null} />
        <Janela label="30d" value={c.variacao_30d_pct ?? null} />
      </View>

      <View className="mt-2 flex-row items-center justify-between gap-2">
        <Text
          className={
            stale
              ? "text-[10px] text-amber-700"
              : "text-[10px] text-milsaca-verde-claro"
          }
          style={{ fontFamily: "Inter_400Regular" }}
        >
          {stale ? "Desatualizada · " : ""}
          {timeAgo(c.current_date)} · {fmtDate(c.current_date)}
        </Text>
        {c.corretora_name ? (
          <View className="rounded-full bg-milsaca-dourado/15 px-2 py-0.5">
            <Text
              className="text-[10px] text-milsaca-verde"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              {c.corretora_name}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function DemoBadgeMobile() {
  const mode =
    (process.env.EXPO_PUBLIC_QUOTES_MODE as string | undefined) ?? "real";
  if (mode !== "demo") return null;
  return (
    <View className="flex-row items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
      <Ionicons name="warning" size={14} color="#b45309" />
      <Text
        className="flex-1 text-[11px] text-amber-900"
        style={{ fontFamily: "Inter_500Medium" }}
      >
        Modo Demonstração — cotações podem ser dados de exemplo.
      </Text>
    </View>
  );
}

function FavoritaSemCotacaoCard({
  c,
  produtorNome,
}: {
  c: FavoritaSemCotacao;
  produtorNome: string | null;
}) {
  const local = [c.city, c.state].filter(Boolean).join(" / ");
  const onWhatsApp = () => {
    const url = buildWhatsAppUrl(
      c.phone,
      `Oi! Sou ${produtorNome ?? "produtor"} e te favoritei no Milsaca. Pode me passar a cotação atual?`,
    );
    if (url) Linking.openURL(url).catch(() => undefined);
  };

  return (
    <View className="rounded-2xl border border-milsaca-dourado/40 bg-milsaca-dourado/5 p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-milsaca-dourado/25">
          <Ionicons name="star" size={18} color="#C9A961" />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row flex-wrap items-center gap-x-2">
            <Text
              className="text-base text-milsaca-verde"
              style={{ fontFamily: "Inter_700Bold" }}
            >
              {c.name}
            </Text>
            {c.verified ? (
              <View className="rounded-full bg-emerald-100 px-2 py-0.5">
                <Text
                  className="text-[10px] text-emerald-800"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  Verificada
                </Text>
              </View>
            ) : null}
          </View>
          {local ? (
            <Text
              className="mt-0.5 text-[11px] text-milsaca-verde-claro"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              {local}
            </Text>
          ) : null}
          <Text
            className="mt-2 text-xs italic text-milsaca-verde-claro"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            Aguardando cotação publicada
          </Text>
        </View>
      </View>
      {c.phone ? (
        <Pressable
          onPress={onWhatsApp}
          className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-milsaca-dourado py-2.5 active:opacity-80"
        >
          <Ionicons name="logo-whatsapp" size={14} color="#2D3A2E" />
          <Text
            className="text-xs text-milsaca-verde"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            Pedir cotação por WhatsApp
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Janela({ label, value }: { label: string; value: number | null }) {
  if (value == null) {
    return (
      <Text
        className="text-[10px] text-milsaca-verde-claro/60"
        style={{ fontFamily: "Inter_400Regular" }}
      >
        {label}: —
      </Text>
    );
  }
  const up = value > 0.001;
  const down = value < -0.001;
  return (
    <Text
      className={
        up
          ? "text-[10px] text-emerald-700"
          : down
            ? "text-[10px] text-rose-700"
            : "text-[10px] text-milsaca-verde-claro"
      }
      style={{ fontFamily: "Inter_500Medium" }}
    >
      {label}: {value > 0 ? "+" : ""}
      {value.toFixed(2)}%
    </Text>
  );
}
