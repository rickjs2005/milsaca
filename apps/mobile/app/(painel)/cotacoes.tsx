// Tela Cotações — paridade com /painel/produtor/cotacoes do web.
// Filtros pill por espécie, cards agrupados com sparkline, tabela
// histórica abaixo.

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  agruparCotacoes,
  listCotacoes,
  type CotacaoCard,
  type CotacaoRow,
} from "../../src/lib/queries";
import type { CoffeeSpecie } from "@milsaca/types";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const SPECIES: { value: CoffeeSpecie | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "arabica", label: "Arábica" },
  { value: "conillon", label: "Conillón" },
];

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function CotacoesScreen() {
  const [rows, setRows] = useState<CotacaoRow[] | null>(null);
  const [filter, setFilter] = useState<CoffeeSpecie | "all">("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await listCotacoes(
      filter === "all" ? {} : { specie: filter },
    );
    setRows(data);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const cards = useMemo<CotacaoCard[]>(
    () => (rows ? agruparCotacoes(rows) : []),
    [rows],
  );

  return (
    <SafeAreaView className="flex-1 bg-milsaca-verde" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#C9A961"
          />
        }
      >
        <Text
          className="text-base text-milsaca-dourado"
          style={{ fontFamily: "Inter_500Medium" }}
        >
          Mercado do café
        </Text>
        <Text
          className="mt-1 text-2xl text-milsaca-cream"
          style={{ fontFamily: "Inter_700Bold" }}
        >
          Cotações
        </Text>

        {/* Filtro pill */}
        <View className="mt-5 flex-row gap-2">
          {SPECIES.map((sp) => {
            const active = filter === sp.value;
            return (
              <Pressable
                key={sp.value}
                onPress={() => setFilter(sp.value)}
                className={
                  active
                    ? "rounded-full bg-milsaca-dourado px-4 py-2 active:opacity-80"
                    : "rounded-full border border-milsaca-dourado/30 px-4 py-2 active:opacity-80"
                }
              >
                <Text
                  className={
                    active
                      ? "text-xs text-milsaca-verde"
                      : "text-xs text-milsaca-cream"
                  }
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  {sp.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!rows ? (
          <View className="mt-12 items-center">
            <ActivityIndicator color="#C9A961" />
          </View>
        ) : cards.length === 0 ? (
          <View className="mt-10 rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-5">
            <Text
              className="text-sm text-milsaca-cream/80"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Sem cotações pra esse filtro. Puxe pra baixo pra atualizar.
            </Text>
          </View>
        ) : (
          <>
            <Text
              className="mt-8 text-xs text-milsaca-dourado"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              PREÇOS ATUAIS
            </Text>
            <View className="mt-2 gap-3">
              {cards.map((c) => {
                const up = (c.variacao_pct ?? 0) >= 0;
                return (
                  <View
                    key={c.key}
                    className="rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-4"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <Text
                          className="text-sm text-milsaca-cream"
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          {c.coffee_type}
                          {c.process ? ` · ${c.process}` : ""}
                        </Text>
                        <Text
                          className="mt-0.5 text-xs text-milsaca-cream/60"
                          style={{ fontFamily: "Inter_400Regular" }}
                        >
                          {c.region ?? "—"}
                          {c.source ? ` · ${c.source}` : ""}
                        </Text>
                      </View>
                      <Sparkline series={c.series} />
                    </View>
                    <View className="mt-3 flex-row items-baseline justify-between">
                      <Text
                        className="text-2xl text-milsaca-cream"
                        style={{ fontFamily: "Inter_700Bold" }}
                      >
                        {BRL.format(c.current_price)}
                      </Text>
                      {c.variacao_pct != null ? (
                        <View
                          className="flex-row items-center gap-1 rounded-full px-2 py-1"
                          style={{
                            backgroundColor: up ? "#22c55e22" : "#C9A96122",
                          }}
                        >
                          <Ionicons
                            name={up ? "arrow-up" : "arrow-down"}
                            size={12}
                            color={up ? "#22c55e" : "#C9A961"}
                          />
                          <Text
                            style={{
                              fontFamily: "Inter_600SemiBold",
                              color: up ? "#22c55e" : "#C9A961",
                              fontSize: 11,
                            }}
                          >
                            {c.variacao_pct >= 0 ? "+" : ""}
                            {c.variacao_pct.toFixed(2)}%
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Histórico */}
            <Text
              className="mt-8 text-xs text-milsaca-dourado"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              HISTÓRICO
            </Text>
            <View className="mt-2 rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro">
              {rows.slice(0, 30).map((r, idx) => (
                <View
                  key={r.id}
                  className={
                    idx === 0
                      ? "flex-row items-center justify-between p-3"
                      : "flex-row items-center justify-between border-t border-milsaca-dourado/10 p-3"
                  }
                >
                  <View className="flex-1">
                    <Text
                      className="text-sm text-milsaca-cream"
                      style={{ fontFamily: "Inter_500Medium" }}
                    >
                      {r.coffee_type}
                      {r.region ? ` · ${r.region}` : ""}
                    </Text>
                    <Text
                      className="mt-0.5 text-xs text-milsaca-cream/60"
                      style={{ fontFamily: "Inter_400Regular" }}
                    >
                      {fmtDate(r.reference_date)}
                      {r.source ? ` · ${r.source}` : ""}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text
                      className="text-sm text-milsaca-cream"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {BRL.format(r.price)}
                    </Text>
                    {r.variacao_pct != null ? (
                      <Text
                        className="mt-0.5 text-xs"
                        style={{
                          fontFamily: "Inter_500Medium",
                          color:
                            r.variacao_pct >= 0 ? "#22c55e" : "#C9A961",
                        }}
                      >
                        {r.variacao_pct >= 0 ? "+" : ""}
                        {r.variacao_pct.toFixed(2)}%
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
