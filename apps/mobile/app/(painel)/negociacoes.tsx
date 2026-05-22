// Tela Negociações — só produtor (mobile não tem painel corretora).
// Lista com filtros pill por status + botão WhatsApp por card.

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../src/lib/auth";
import {
  LEAD_STATUS_BADGE,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_ORDER,
  listMinhasNegociacoes,
  type LeadItem,
} from "../../src/lib/queries";
import { buildWhatsAppUrl } from "../../src/lib/whatsapp";
import type { LeadStatus } from "@milsaca/types";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const FILTERS: { value: LeadStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  ...LEAD_STATUS_ORDER.filter((s) => s !== "arquivado").map((s) => ({
    value: s,
    label: LEAD_STATUS_LABEL[s],
  })),
];

export default function NegociacoesScreen() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [items, setItems] = useState<LeadItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const filterArg = filter === "all" ? {} : { status: filter };
    setItems(await listMinhasNegociacoes(profile.id, filterArg));
  }, [filter, profile]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openWhatsApp = (item: LeadItem) => {
    const msg = `Olá ${item.corretora_nome}, queria conversar sobre a proposta de ${item.coffee_type ?? "café"}${item.bag_count ? ` (${item.bag_count} sacas)` : ""}.`;
    const url = buildWhatsAppUrl(item.corretora_phone, msg);
    if (!url) return;
    Linking.openURL(url).catch(() => {
      // silencioso — produtor sem WhatsApp instalado
    });
  };

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
          Negociações
        </Text>

        {/* Filtros pill */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          className="mt-5 -mx-1 px-1"
        >
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <Pressable
                key={f.value}
                onPress={() => setFilter(f.value)}
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
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {!items ? (
          <View className="mt-12 items-center">
            <ActivityIndicator color="#C9A961" />
          </View>
        ) : items.length === 0 ? (
          <View className="mt-10 rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-5">
            <Text
              className="text-sm text-milsaca-cream/80"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Nenhuma proposta pra você nesse filtro.
            </Text>
            <Text
              className="mt-2 text-xs text-milsaca-cream/60"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Favorite corretoras na aba Corretoras pra receber propostas.
            </Text>
          </View>
        ) : (
          <View className="mt-5 gap-3">
            {items.map((item) => {
              const badge = LEAD_STATUS_BADGE[item.status];
              const total =
                item.bag_count && item.proposed_price
                  ? item.bag_count * item.proposed_price
                  : null;
              return (
                <View
                  key={item.id}
                  className="rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-4"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text
                        className="text-sm text-milsaca-cream"
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        {item.corretora_nome}
                      </Text>
                      <Text
                        className="mt-0.5 text-xs text-milsaca-cream/60"
                        style={{ fontFamily: "Inter_400Regular" }}
                      >
                        {item.corretora_city ?? "—"}
                      </Text>
                    </View>
                    <View
                      className="rounded-full px-2 py-1"
                      style={{ backgroundColor: badge.bg }}
                    >
                      <Text
                        style={{
                          color: badge.text,
                          fontFamily: "Inter_500Medium",
                          fontSize: 10,
                        }}
                      >
                        {LEAD_STATUS_LABEL[item.status]}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-3">
                    <Text
                      className="text-sm text-milsaca-cream"
                      style={{ fontFamily: "Inter_500Medium" }}
                    >
                      {item.coffee_type ?? "Café"}
                      {item.bag_count ? ` · ${item.bag_count} sacas` : ""}
                    </Text>
                    {item.proposed_price ? (
                      <Text
                        className="mt-1 text-xs text-milsaca-cream/70"
                        style={{ fontFamily: "Inter_400Regular" }}
                      >
                        {BRL.format(item.proposed_price)}/saca
                        {total ? ` · total ${BRL.format(total)}` : ""}
                      </Text>
                    ) : null}
                    {item.notes ? (
                      <Text
                        className="mt-2 text-xs italic text-milsaca-cream/70"
                        style={{ fontFamily: "Inter_400Regular" }}
                      >
                        “{item.notes}”
                      </Text>
                    ) : null}
                  </View>

                  {item.corretora_phone ? (
                    <Pressable
                      onPress={() => openWhatsApp(item)}
                      className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-milsaca-dourado py-2.5 active:opacity-80"
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#2D3A2E" />
                      <Text
                        className="text-sm text-milsaca-verde"
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        Conversar no WhatsApp
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
