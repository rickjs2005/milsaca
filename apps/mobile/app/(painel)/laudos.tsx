// Tela Laudos — read-only do produtor. Lista classificações COB dos lotes
// dele (RLS já filtra) com link público + PDF abertos no browser.

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { useList } from "../../src/lib/use-list";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../src/lib/supabase";

const SUPABASE_PUBLIC_URL =
  process.env.EXPO_PUBLIC_SITE_URL ?? "https://milsaca.app";

interface LaudoRow {
  id: string;
  tipo: string | null;
  pontuacao: number | null;
  fora_de_tipo: boolean;
  bebida: string | null;
  peneira_dominante: string | null;
  pva: number | null;
  created_at: string;
  lote: {
    codigo: string;
    specie: string;
    processo: string | null;
    safra: string | null;
  } | null;
  corretora: { name: string } | null;
}

type Raw = Omit<LaudoRow, "lote" | "corretora" | "pva"> & {
  pva: number | string | null;
  lote:
    | LaudoRow["lote"]
    | NonNullable<LaudoRow["lote"]>[]
    | null;
  corretora:
    | LaudoRow["corretora"]
    | NonNullable<LaudoRow["corretora"]>[]
    | null;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default function LaudosScreen() {
  const {
    data: items,
    error,
    refreshing,
    reload,
    onRefresh,
  } = useList<LaudoRow[]>(
    async () => {
      const { data, error: err } = await supabase
        .from("classificacoes_cob")
        .select(
          `id, tipo, pontuacao, fora_de_tipo, bebida, peneira_dominante,
           pva, created_at,
           lote:lotes!classificacoes_cob_lote_id_fkey(codigo, specie, processo, safra),
           corretora:corretoras!classificacoes_cob_corretora_id_fkey(name)`,
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (err) throw err;
      return ((data ?? []) as Raw[]).map((r) => ({
        ...r,
        pva: r.pva != null ? Number(r.pva) : null,
        lote: pickOne(r.lote),
        corretora: pickOne(r.corretora),
      }));
    },
    [],
    "Erro ao carregar laudos",
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
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full bg-milsaca-verde-claro active:opacity-80"
          >
            <Ionicons name="chevron-back" size={18} color="#FAF7F0" />
          </Pressable>
        </View>

        <Text
          className="mt-4 text-base text-milsaca-dourado"
          style={{ fontFamily: "Inter_500Medium" }}
        >
          Qualidade
        </Text>
        <Text
          className="mt-1 text-2xl text-milsaca-cream"
          style={{ fontFamily: "Inter_700Bold" }}
        >
          Meus laudos
        </Text>

        {error ? (
          <View className="mt-12 items-center">
            <Text
              className="text-center text-sm text-red-300"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              {error}
            </Text>
            <Pressable
              onPress={reload}
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
              Sem laudos por aqui ainda. Quando a corretora classificar um dos
              seus lotes, aparece aqui com link público + PDF.
            </Text>
          </View>
        ) : (
          <View className="mt-5 gap-3">
            {items.map((r) => (
              <View
                key={r.id}
                className="rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-4"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text
                      className="text-xs text-milsaca-dourado"
                      style={{ fontFamily: "Inter_500Medium" }}
                    >
                      {r.lote?.codigo ?? "—"}
                    </Text>
                    <Text
                      className="mt-1 text-sm text-milsaca-cream"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {r.lote?.specie === "arabica"
                        ? "Arábica"
                        : r.lote?.specie === "conillon"
                          ? "Conilón"
                          : "—"}
                      {r.lote?.processo ? ` · ${r.lote.processo}` : ""}
                      {r.lote?.safra ? ` · ${r.lote.safra}` : ""}
                    </Text>
                  </View>
                  <View
                    className="rounded-full px-2 py-1"
                    style={{
                      backgroundColor: r.fora_de_tipo
                        ? "rgba(252,165,165,0.25)"
                        : "rgba(134,239,172,0.25)",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 11,
                        color: r.fora_de_tipo ? "#fecaca" : "#86efac",
                      }}
                    >
                      {r.fora_de_tipo ? "Fora de tipo" : `Tipo ${r.tipo ?? "—"}`}
                    </Text>
                  </View>
                </View>

                <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1">
                  <KV label="Pontuação" value={r.pontuacao?.toString() ?? "—"} />
                  <KV label="Peneira" value={r.peneira_dominante ?? "—"} />
                  <KV label="Bebida" value={r.bebida ?? "—"} />
                  <KV
                    label="PVA"
                    value={r.pva != null ? `${r.pva.toFixed(1)}%` : "—"}
                  />
                </View>

                <Text
                  className="mt-2 text-[10px] text-milsaca-cream/60"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {r.corretora?.name ?? "—"} · {fmtDate(r.created_at)}
                </Text>

                <View className="mt-3 flex-row gap-2">
                  <Pressable
                    onPress={() =>
                      Linking.openURL(`${SUPABASE_PUBLIC_URL}/laudos/${r.id}`)
                    }
                    className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-milsaca-dourado/40 py-2.5 active:opacity-80"
                  >
                    <Ionicons name="qr-code-outline" size={14} color="#C9A961" />
                    <Text
                      className="text-xs text-milsaca-dourado"
                      style={{ fontFamily: "Inter_500Medium" }}
                    >
                      Link público
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      Linking.openURL(
                        `${SUPABASE_PUBLIC_URL}/laudos/${r.id}/pdf`,
                      )
                    }
                    className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-milsaca-dourado py-2.5 active:opacity-80"
                  >
                    <Ionicons name="download-outline" size={14} color="#2D3A2E" />
                    <Text
                      className="text-xs text-milsaca-verde"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      Baixar PDF
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text
        className="text-[10px] text-milsaca-cream/60"
        style={{ fontFamily: "Inter_400Regular" }}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        className="text-xs text-milsaca-cream"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {value}
      </Text>
    </View>
  );
}
