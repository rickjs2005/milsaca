// Tela Contratos — produtor only (mobile não tem painel corretora).
// Read-only. Filtros pill por status. Indicador de assinatura (CheckCircle)
// quando ativo/finalizado.

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
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
import { coffeeLabel } from "../../src/lib/coffee";
import { useList } from "../../src/lib/use-list";
import {
  CONTRATO_STATUS_BADGE,
  CONTRATO_STATUS_LABEL,
  CONTRATO_STATUS_ORDER,
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
  const { profile } = useAuth();
  const [filter, setFilter] = useState<ContratoStatus | "all">("all");
  const {
    data: items,
    error,
    refreshing,
    reload,
    onRefresh,
  } = useList<ContratoItem[]>(async () => {
    if (!profile) return;
    const filterArg = filter === "all" ? {} : { status: filter };
    return listMeusContratos(profile.id, filterArg);
  }, [filter, profile]);

  const openWhatsApp = (item: ContratoItem) => {
    const nome = profile?.full_name?.trim() || null;
    const intro = nome ? `Oi! Aqui é ${nome}.` : "Oi! Aqui é da Milsaca.";
    const detalhe = [
      item.coffee_type ? coffeeLabel(item.coffee_type) : null,
      item.bag_count ? `${item.bag_count} sacas` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const sobre = detalhe
      ? `É sobre o contrato ${item.code} (${detalhe}).`
      : `É sobre o contrato ${item.code}.`;
    const msg = `${intro}\n${sobre}\nQueria alinhar a entrega — quando puder, me chama!`;
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

        {error && !items ? (
          <View className="mt-10 rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-5">
            <Text
              className="text-sm text-milsaca-cream"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              Não foi possível carregar
            </Text>
            <Text
              className="mt-1 text-xs text-milsaca-cream/70"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              {error} Verifique sua conexão e tente de novo.
            </Text>
            <Pressable
              onPress={() => reload()}
              className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-milsaca-dourado/40 py-2.5 active:opacity-80"
            >
              <Ionicons name="refresh" size={16} color="#C9A961" />
              <Text
                className="text-sm text-milsaca-dourado"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                Tentar de novo
              </Text>
            </Pressable>
          </View>
        ) : !items ? (
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
                      {coffeeLabel(c.coffee_type) ?? "Café"}
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

                  {c.bag_count && c.bag_count > 0 ? (
                    <View
                      className={
                        c.sacas_pendentes > 0
                          ? "mt-3 rounded-xl border border-milsaca-dourado/40 bg-milsaca-dourado/10 px-3 py-2"
                          : "mt-3 rounded-xl border border-milsaca-dourado/15 bg-milsaca-verde/30 px-3 py-2"
                      }
                    >
                      <View className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <Text
                          className="text-[11px] text-milsaca-cream/70"
                          style={{ fontFamily: "Inter_400Regular" }}
                        >
                          Entregues {c.sacas_entregues}
                          {c.sacas_em_transito > 0
                            ? ` · Em trânsito ${c.sacas_em_transito}`
                            : ""}{" "}
                          de {c.bag_count}
                        </Text>
                        {c.sacas_pendentes > 0 ? (
                          <Text
                            className="text-xs text-milsaca-dourado"
                            style={{ fontFamily: "Inter_600SemiBold" }}
                          >
                            Faltam {c.sacas_pendentes} sacas
                          </Text>
                        ) : (
                          <Text
                            className="text-xs text-emerald-300"
                            style={{ fontFamily: "Inter_500Medium" }}
                          >
                            Saldo zerado
                          </Text>
                        )}
                      </View>
                    </View>
                  ) : null}

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
