// Entregas read-only do produtor mobile. Espelha
// /painel/produtor/entregas do web.

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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

import { useAuth } from "../../src/lib/auth";
import { supabase } from "../../src/lib/supabase";

const STATUS_LABEL: Record<string, string> = {
  programada: "Programada",
  em_transito: "Em trânsito",
  recebida: "Recebida",
  conferida: "Conferida",
  cancelada: "Cancelada",
};

const STATUS_BG: Record<string, string> = {
  programada: "rgba(224,198,138,0.25)",
  em_transito: "rgba(125,211,252,0.25)",
  recebida: "rgba(134,239,172,0.25)",
  conferida: "#2D3A2E",
  cancelada: "rgba(203,213,225,0.25)",
};

const STATUS_FG: Record<string, string> = {
  programada: "#C9A961",
  em_transito: "#7dd3fc",
  recebida: "#86efac",
  conferida: "#FAF7F0",
  cancelada: "#cbd5e1",
};

const PENDENTE = ["programada", "em_transito"];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y.slice(2)}`;
}

type Row = {
  id: string;
  sequencia: number;
  bag_count: number | null;
  status: string;
  data_prevista: string | null;
  data_realizada: string | null;
  peso_liquido_kg: number | string | null;
  contrato:
    | { code: string; corretora: { name: string } | { name: string }[] | null }
    | { code: string; corretora: { name: string } | { name: string }[] | null }[]
    | null;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default function EntregasScreen() {
  const { profile } = useAuth();
  const {
    data: items,
    error,
    refreshing,
    reload,
    onRefresh,
  } = useList<Row[]>(
    async () => {
      if (!profile) return;
      const { data, error: err } = await supabase
        .from("entregas")
        .select(
          `id, sequencia, bag_count, status, data_prevista, data_realizada,
           peso_liquido_kg,
           contrato:contratos!entregas_contrato_id_fkey(code, corretora:corretoras!contratos_corretora_id_fkey(name))`,
        )
        .eq("produtor_id", profile.id)
        .order("data_prevista", { ascending: false, nullsFirst: false })
        .limit(100);
      if (err) throw err;
      return (data ?? []) as Row[];
    },
    [profile],
    "Erro ao carregar entregas",
  );

  const today = new Date().toISOString().slice(0, 10);

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
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full bg-milsaca-verde-claro active:opacity-80"
        >
          <Ionicons name="chevron-back" size={18} color="#FAF7F0" />
        </Pressable>

        <Text
          className="mt-4 text-base text-milsaca-dourado"
          style={{ fontFamily: "Inter_500Medium" }}
        >
          Logística
        </Text>
        <Text
          className="mt-1 text-2xl text-milsaca-cream"
          style={{ fontFamily: "Inter_700Bold" }}
        >
          Minhas entregas
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
              Sem entregas ainda. Quando a corretora programar uma retirada,
              aparece aqui.
            </Text>
          </View>
        ) : (
          <View className="mt-5 gap-3">
            {items.map((e) => {
              const c = pickOne(e.contrato);
              const cor = c ? pickOne(c.corretora) : null;
              const atrasada =
                PENDENTE.includes(e.status) &&
                e.data_prevista != null &&
                e.data_prevista < today;
              const liquido =
                e.peso_liquido_kg != null ? Number(e.peso_liquido_kg) : null;
              return (
                <View
                  key={e.id}
                  className="rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-4"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text
                        className="text-xs text-milsaca-dourado"
                        style={{ fontFamily: "Inter_500Medium" }}
                      >
                        {c?.code ?? "—"} · #{e.sequencia}
                      </Text>
                      <Text
                        className="mt-0.5 text-sm text-milsaca-cream"
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        {cor?.name ?? "—"}
                      </Text>
                    </View>
                    <View
                      className="rounded-full px-2 py-1"
                      style={{ backgroundColor: STATUS_BG[e.status] }}
                    >
                      <Text
                        style={{
                          color: STATUS_FG[e.status],
                          fontFamily: "Inter_500Medium",
                          fontSize: 10,
                        }}
                      >
                        {STATUS_LABEL[e.status] ?? e.status}
                      </Text>
                    </View>
                  </View>

                  <Text
                    className="mt-2 text-xs text-milsaca-cream/80"
                    style={{ fontFamily: "Inter_400Regular" }}
                  >
                    {e.bag_count ? `${e.bag_count} sacas · ` : ""}
                    Prevista{" "}
                    <Text
                      style={{
                        color: atrasada ? "#fca5a5" : undefined,
                        fontFamily: atrasada
                          ? "Inter_600SemiBold"
                          : "Inter_400Regular",
                      }}
                    >
                      {fmtDate(e.data_prevista)}
                    </Text>
                    {e.data_realizada
                      ? ` · Entregue ${fmtDate(e.data_realizada)}`
                      : ""}
                    {liquido ? ` · ${liquido.toLocaleString("pt-BR")} kg` : ""}
                  </Text>

                  {atrasada ? (
                    <View
                      className="mt-2 self-start rounded-full px-2 py-0.5"
                      style={{ backgroundColor: "rgba(252,165,165,0.25)" }}
                    >
                      <Text
                        style={{
                          color: "#fca5a5",
                          fontSize: 10,
                          fontFamily: "Inter_500Medium",
                        }}
                      >
                        Em atraso
                      </Text>
                    </View>
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
