// Vitrine de corretoras pro produtor.
// Lista TODAS as corretoras cadastradas (não só as vinculadas) via view
// pública corretoras_publicas, permite favoritar e abrir WhatsApp.

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

import { useAuth } from "../../src/lib/auth";
import {
  listCorretorasParaProdutor,
  toggleFavoritoCorretora,
  type CorretoraVitrineItem,
} from "../../src/lib/queries";
import { buildWhatsAppUrl } from "../../src/lib/whatsapp";

type FilterKey = "all" | "favoritas" | "verificadas";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "favoritas", label: "Favoritas" },
  { key: "verificadas", label: "Verificadas" },
];

export default function CorretorasScreen() {
  const { profile } = useAuth();
  const [lista, setLista] = useState<CorretoraVitrineItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    try {
      const rows = await listCorretorasParaProdutor(profile.id);
      setLista(rows);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não conseguimos carregar as corretoras.",
      );
    }
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onToggleFavorita = useCallback(
    async (c: CorretoraVitrineItem) => {
      if (!profile || busyId) return;
      setBusyId(c.id);
      // Optimistic
      setLista((prev) =>
        prev
          ? prev.map((row) =>
              row.id === c.id ? { ...row, is_favorita: !row.is_favorita } : row,
            )
          : prev,
      );
      const result = await toggleFavoritoCorretora(
        profile.id,
        c.id,
        c.is_favorita ? "remove" : "add",
      );
      setBusyId(null);
      if (result.error) {
        // Reverte
        setLista((prev) =>
          prev
            ? prev.map((row) =>
                row.id === c.id
                  ? { ...row, is_favorita: c.is_favorita }
                  : row,
              )
            : prev,
        );
      }
    },
    [profile, busyId],
  );

  const filtered = (lista ?? []).filter((c) => {
    if (filter === "favoritas") return c.is_favorita;
    if (filter === "verificadas") return c.verified;
    return true;
  });

  const totalFavoritas = (lista ?? []).filter((c) => c.is_favorita).length;

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
        {/* Header */}
        <View>
          <Text
            className="text-sm text-milsaca-dourado"
            style={{ fontFamily: "Inter_500Medium" }}
          >
            Catálogo
          </Text>
          <Text
            className="mt-1 text-3xl leading-9 text-milsaca-cream"
            style={{ fontFamily: "Inter_700Bold" }}
          >
            Corretoras
          </Text>
          <Text
            className="mt-2 text-sm text-milsaca-cream/70"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            Veja todas as corretoras cadastradas e fale direto pelo WhatsApp.
            Marque favoritas pra ver as cotações delas em destaque.
          </Text>
        </View>

        {/* Filtros */}
        <View className="mt-5 flex-row gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const showBadge = f.key === "favoritas" && totalFavoritas > 0;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                className={
                  active
                    ? "flex-row items-center gap-1.5 rounded-full bg-milsaca-dourado px-4 py-2 active:opacity-80"
                    : "flex-row items-center gap-1.5 rounded-full border border-milsaca-dourado/30 px-4 py-2 active:opacity-80"
                }
              >
                <Text
                  className={
                    active
                      ? "text-xs text-milsaca-verde"
                      : "text-xs text-milsaca-cream/80"
                  }
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  {f.label}
                </Text>
                {showBadge ? (
                  <View
                    className={
                      active
                        ? "rounded-full bg-milsaca-verde/20 px-1.5"
                        : "rounded-full bg-milsaca-dourado/20 px-1.5"
                    }
                  >
                    <Text
                      className={
                        active
                          ? "text-[10px] text-milsaca-verde"
                          : "text-[10px] text-milsaca-dourado"
                      }
                      style={{ fontFamily: "Inter_700Bold" }}
                    >
                      {totalFavoritas}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* Estados */}
        {error ? (
          <View className="mt-12 items-center px-2">
            <Text
              className="text-center text-sm text-red-300"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              {error}
            </Text>
            <Pressable
              onPress={load}
              className="mt-4 rounded-2xl bg-milsaca-dourado px-5 py-3 active:opacity-80"
            >
              <Text
                className="text-sm text-milsaca-verde"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Tentar de novo
              </Text>
            </Pressable>
          </View>
        ) : lista == null ? (
          <View className="mt-12 items-center">
            <ActivityIndicator color="#C9A961" />
          </View>
        ) : filtered.length === 0 ? (
          <View className="mt-12 items-center px-4">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-milsaca-dourado/15">
              <Ionicons name="business-outline" size={28} color="#C9A961" />
            </View>
            <Text
              className="mt-4 text-center text-base text-milsaca-cream"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              {filter === "favoritas"
                ? "Você ainda não favoritou nenhuma corretora."
                : filter === "verificadas"
                  ? "Nenhuma corretora verificada disponível."
                  : "Nenhuma corretora cadastrada ainda."}
            </Text>
            {filter !== "all" ? (
              <Pressable
                onPress={() => setFilter("all")}
                className="mt-4 rounded-2xl border border-milsaca-dourado/40 px-5 py-2 active:opacity-70"
              >
                <Text
                  className="text-sm text-milsaca-dourado"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  Ver todas
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View className="mt-6 gap-3">
            {filtered.map((c) => (
              <CorretoraCard
                key={c.id}
                c={c}
                busy={busyId === c.id}
                onToggleFavorita={() => onToggleFavorita(c)}
                produtorNome={profile?.full_name ?? null}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CorretoraCard({
  c,
  busy,
  onToggleFavorita,
  produtorNome,
}: {
  c: CorretoraVitrineItem;
  busy: boolean;
  onToggleFavorita: () => void;
  produtorNome: string | null;
}) {
  const local = [c.city, c.state].filter(Boolean).join(" / ");
  const onWhatsApp = () => {
    const url = buildWhatsAppUrl(
      c.phone,
      `Oi! Vi a ${c.name} no Milsaca${produtorNome ? `, sou ${produtorNome}` : ""}. Gostaria de conversar sobre cotações de café.`,
    );
    if (url) Linking.openURL(url).catch(() => undefined);
  };

  return (
    <View className="rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-milsaca-dourado/20">
          <Ionicons name="business" size={20} color="#C9A961" />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="text-base text-milsaca-cream"
            style={{ fontFamily: "Inter_700Bold" }}
            numberOfLines={2}
          >
            {c.name}
          </Text>
          <View className="mt-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
            {local ? (
              <View className="flex-row items-center gap-1">
                <Ionicons name="location-outline" size={12} color="#C9A961" />
                <Text
                  className="text-xs text-milsaca-cream/70"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {local}
                </Text>
              </View>
            ) : null}
            {c.verified ? (
              <View className="flex-row items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5">
                <Ionicons
                  name="shield-checkmark"
                  size={11}
                  color="rgb(110,231,183)"
                />
                <Text
                  className="text-[10px] text-emerald-200"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  Verificada
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Pressable
          onPress={onToggleFavorita}
          disabled={busy}
          hitSlop={8}
          className="p-1 active:opacity-60"
        >
          <Ionicons
            name={c.is_favorita ? "star" : "star-outline"}
            size={22}
            color={c.is_favorita ? "#C9A961" : "rgba(250,247,240,0.5)"}
          />
        </Pressable>
      </View>

      {c.regioes_atendimento.length > 0 ? (
        <View className="mt-3 flex-row flex-wrap gap-1.5">
          {c.regioes_atendimento.slice(0, 4).map((r) => (
            <View
              key={r}
              className="rounded-full bg-milsaca-dourado/15 px-2 py-0.5"
            >
              <Text
                className="text-[10px] text-milsaca-dourado"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                {formatRegiao(r)}
              </Text>
            </View>
          ))}
          {c.regioes_atendimento.length > 4 ? (
            <Text
              className="text-[10px] text-milsaca-cream/50"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              +{c.regioes_atendimento.length - 4}
            </Text>
          ) : null}
        </View>
      ) : null}

      {c.qtd_negociacoes > 0 || c.qtd_contratos > 0 ? (
        <View className="mt-3 flex-row gap-2">
          {c.qtd_negociacoes > 0 ? (
            <View className="rounded bg-milsaca-verde/40 px-2 py-0.5">
              <Text
                className="text-[10px] text-milsaca-cream"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                {c.qtd_negociacoes} negociaç
                {c.qtd_negociacoes === 1 ? "ão" : "ões"}
              </Text>
            </View>
          ) : null}
          {c.qtd_contratos > 0 ? (
            <View className="rounded bg-emerald-500/30 px-2 py-0.5">
              <Text
                className="text-[10px] text-emerald-100"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                {c.qtd_contratos} contrato
                {c.qtd_contratos === 1 ? "" : "s"}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View className="mt-3 gap-2">
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(painel)/ofertar",
              params: { corretora: c.id },
            })
          }
          className="flex-row items-center justify-center gap-2 rounded-xl border border-milsaca-dourado bg-milsaca-verde/50 py-3 active:opacity-80"
        >
          <Ionicons name="cafe-outline" size={16} color="#C9A961" />
          <Text
            className="text-sm text-milsaca-dourado"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            Ofertar café pra essa corretora
          </Text>
        </Pressable>
        <Pressable
          onPress={onWhatsApp}
          disabled={!c.phone}
          className="flex-row items-center justify-center gap-2 rounded-xl bg-milsaca-dourado py-3 active:opacity-80 disabled:opacity-40"
        >
          <Ionicons name="logo-whatsapp" size={16} color="#2D3A2E" />
          <Text
            className="text-sm text-milsaca-verde"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {c.phone ? "WhatsApp" : "Sem telefone"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function formatRegiao(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
