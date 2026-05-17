// Tela Contratos — paridade /painel/produtor/contratos e /painel/corretora/contratos.
// Read-only. Filtros pill por status. Indicador de assinatura (CheckCircle)
// quando ativo/finalizado.

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
  CONTRATO_STATUS_BADGE,
  CONTRATO_STATUS_LABEL,
  CONTRATO_STATUS_ORDER,
  listContratosDaCorretora,
  listMeusContratos,
  type ContratoItem,
} from "../../src/lib/queries";
import { buildWhatsAppUrl } from "../../src/lib/whatsapp";
import type { ContratoStatus } from "@milsaca/types";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const FILTERS: { value: ContratoStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  ...CONTRATO_STATUS_ORDER.map((s) => ({
    value: s,
    label: CONTRATO_STATUS_LABEL[s],
  })),
];

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default function ContratosScreen() {
  const { profile, activeRole } = useAuth();
  const [filter, setFilter] = useState<ContratoStatus | "all">("all");
  const [items, setItems] = useState<ContratoItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isCorretora = activeRole === "corretora";

  const load = useCallback(async () => {
    if (!profile) return;
    const filterArg = filter === "all" ? {} : { status: filter };
    if (isCorretora && profile.corretora_id) {
      setItems(
        await listContratosDaCorretora(profile.corretora_id, filterArg),
      );
    } else {
      setItems(await listMeusContratos(profile.id, filterArg));
    }
  }, [filter, isCorretora, profile]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openWhatsApp = (item: ContratoItem) => {
    const msg = `Olá! Sobre o contrato ${item.code} — gostaria de conversar.`;
    const url = buildWhatsAppUrl(item.corretora_phone, msg);
    if (!url) return;
    Linking.openURL(url).catch(() => undefined);
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
          Documentos
        </Text>
        <Text
          className="mt-1 text-2xl text-milsaca-cream"
          style={{ fontFamily: "Inter_700Bold" }}
        >
          Contratos
        </Text>

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
              Nenhum contrato nesse filtro.
            </Text>
          </View>
        ) : (
          <View className="mt-5 gap-3">
            {items.map((c) => {
              const badge = CONTRATO_STATUS_BADGE[c.status];
              const signed =
                c.status === "ativo" || c.status === "finalizado";
              return (
                <View
                  key={c.id}
                  className="rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-4"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text
                        className="text-xs text-milsaca-dourado"
                        style={{ fontFamily: "Inter_500Medium" }}
                      >
                        {c.code}
                      </Text>
                      <Text
                        className="mt-0.5 text-sm text-milsaca-cream"
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        {c.corretora_nome}
                      </Text>
                      <Text
                        className="mt-0.5 text-xs text-milsaca-cream/60"
                        style={{ fontFamily: "Inter_400Regular" }}
                      >
                        {c.corretora_city ?? "—"}
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
                        {CONTRATO_STATUS_LABEL[c.status]}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1">
                    <Text
                      className="text-xs text-milsaca-cream/80"
                      style={{ fontFamily: "Inter_500Medium" }}
                    >
                      {c.coffee_type ?? "Café"}
                      {c.bag_count ? ` · ${c.bag_count} sacas` : ""}
                    </Text>
                    {c.total_value ? (
                      <Text
                        className="text-xs text-milsaca-cream/80"
                        style={{ fontFamily: "Inter_500Medium" }}
                      >
                        Total {BRL.format(c.total_value)}
                      </Text>
                    ) : null}
                  </View>

                  {signed && c.signed_at ? (
                    <View className="mt-3 flex-row items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2">
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#86efac"
                      />
                      <Text
                        className="text-xs"
                        style={{
                          fontFamily: "Inter_500Medium",
                          color: "#86efac",
                        }}
                      >
                        Assinado em {fmtDate(c.signed_at)}
                      </Text>
                    </View>
                  ) : null}

                  {c.corretora_phone ? (
                    <Pressable
                      onPress={() => openWhatsApp(c)}
                      className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-milsaca-dourado/40 py-2.5 active:opacity-80"
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#C9A961" />
                      <Text
                        className="text-sm text-milsaca-dourado"
                        style={{ fontFamily: "Inter_500Medium" }}
                      >
                        WhatsApp
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
