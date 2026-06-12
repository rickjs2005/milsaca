// Notificações do produtor mobile — read-only.

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

import { supabase } from "../../src/lib/supabase";

const KIND_LABEL: Record<string, string> = {
  lead: "Proposta",
  contrato: "Contrato",
  entrega: "Entrega",
  pagamento: "Pagamento",
  cotacao: "Cotação",
  price_alert: "Alerta de preço",
  social: "Comunidade",
  sistema: "Sistema",
};

const KIND_BG: Record<string, string> = {
  lead: "rgba(125,211,252,0.25)",
  contrato: "rgba(134,239,172,0.25)",
  entrega: "rgba(251,191,36,0.25)",
  pagamento: "rgba(196,181,253,0.25)",
  cotacao: "rgba(224,198,138,0.25)",
  price_alert: "rgba(125,211,252,0.25)",
  social: "rgba(224,198,138,0.25)",
  sistema: "rgba(203,213,225,0.25)",
};

const KIND_FG: Record<string, string> = {
  lead: "#7dd3fc",
  contrato: "#86efac",
  entrega: "#fbbf24",
  pagamento: "#c4b5fd",
  cotacao: "#C9A961",
  price_alert: "#7dd3fc",
  social: "#C9A961",
  sistema: "#cbd5e1",
};

type Row = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

function fmtRelative(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 60000; // min
  if (diff < 1) return "agora";
  if (diff < 60) return `${Math.floor(diff)} min`;
  if (diff < 24 * 60) return `${Math.floor(diff / 60)} h`;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function NotificacoesScreen() {
  const {
    data: items,
    error,
    refreshing,
    reload,
    onRefresh,
  } = useList<Row[]>(
    async () => {
      const { data, error: err } = await supabase
        .from("notifications")
        .select("id, kind, title, body, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (err) throw err;
      return (data ?? []) as Row[];
    },
    [],
    "Erro ao carregar notificações",
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
          Avisos
        </Text>
        <Text
          className="mt-1 text-2xl text-milsaca-cream"
          style={{ fontFamily: "Inter_700Bold" }}
        >
          Notificações
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
              Sem notificações por enquanto.
            </Text>
          </View>
        ) : (
          <View className="mt-5 gap-2">
            {items.map((n) => (
              <View
                key={n.id}
                className={
                  n.read_at
                    ? "rounded-2xl border border-milsaca-dourado/10 bg-milsaca-verde-claro/60 p-4"
                    : "rounded-2xl border border-milsaca-dourado/30 bg-milsaca-verde-claro p-4"
                }
              >
                <View className="flex-row items-start justify-between">
                  <View
                    className="rounded-full px-2 py-0.5"
                    style={{ backgroundColor: KIND_BG[n.kind] ?? KIND_BG.sistema }}
                  >
                    <Text
                      style={{
                        color: KIND_FG[n.kind] ?? KIND_FG.sistema,
                        fontFamily: "Inter_500Medium",
                        fontSize: 10,
                      }}
                    >
                      {KIND_LABEL[n.kind] ?? n.kind}
                    </Text>
                  </View>
                  <Text
                    className="text-[10px] text-milsaca-cream/60"
                    style={{ fontFamily: "Inter_400Regular" }}
                  >
                    {fmtRelative(n.created_at)}
                  </Text>
                </View>
                <Text
                  className="mt-2 text-sm text-milsaca-cream"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  {n.title}
                </Text>
                {n.body ? (
                  <Text
                    className="mt-1 text-xs text-milsaca-cream/80"
                    style={{ fontFamily: "Inter_400Regular" }}
                  >
                    {n.body}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
