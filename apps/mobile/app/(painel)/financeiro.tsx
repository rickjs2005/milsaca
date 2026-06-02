// Financeiro do produtor mobile — lista de repasses com totais.

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
import {
  PAGAMENTO_STATUS_BG,
  PAGAMENTO_STATUS_FG,
  PAGAMENTO_STATUS_LABEL,
} from "../../src/lib/queries";
import { supabase } from "../../src/lib/supabase";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y.slice(2)}`;
}

type Row = {
  id: string;
  valor_bruto: number | string;
  descontos: Record<string, unknown> | null;
  valor_liquido: number | string;
  status: string;
  data_prevista: string | null;
  data_paga: string | null;
  observacoes: string | null;
  contrato: { code: string } | { code: string }[] | null;
  corretora: { name: string } | { name: string }[] | null;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default function FinanceiroScreen() {
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
        .from("produtor_pagamentos")
        .select(
          `id, valor_bruto, descontos, valor_liquido, status,
           data_prevista, data_paga, observacoes,
           contrato:contratos!produtor_pagamentos_contrato_id_fkey(code),
           corretora:corretoras!produtor_pagamentos_corretora_id_fkey(name)`,
        )
        .eq("produtor_id", profile.id)
        .order("data_prevista", { ascending: false, nullsFirst: false })
        .limit(100);
      if (err) throw err;
      return (data ?? []) as Row[];
    },
    [profile],
    "Erro ao carregar repasses",
  );

  const totals = (items ?? []).reduce(
    (acc, r) => {
      const v = Number(r.valor_liquido);
      if (r.status === "pago") acc.pago += v;
      else if (r.status === "pendente") acc.pendente += v;
      else if (r.status === "vencido") acc.vencido += v;
      return acc;
    },
    { pago: 0, pendente: 0, vencido: 0 },
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
          Meu dinheiro
        </Text>
        <Text
          className="mt-1 text-2xl text-milsaca-cream"
          style={{ fontFamily: "Inter_700Bold" }}
        >
          Financeiro
        </Text>

        {/* Totais */}
        <View className="mt-5 flex-row gap-3">
          <Total label="A receber" value={totals.pendente} tone="info" />
          <Total label="Recebido" value={totals.pago} tone="success" />
          <Total label="Atrasado" value={totals.vencido} tone="warn" />
        </View>

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
          <View className="mt-8 rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-5">
            <Text
              className="text-sm text-milsaca-cream/80"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Sem repasses por aqui. Quando uma entrega for conferida e a
              corretora lançar o repasse, aparece nesta tela.
            </Text>
          </View>
        ) : (
          <View className="mt-5 gap-3">
            {items.map((r) => {
              const c = pickOne(r.contrato);
              const cor = pickOne(r.corretora);
              return (
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
                        {c?.code ?? "—"} · {cor?.name ?? "—"}
                      </Text>
                      <Text
                        className="mt-1 text-xs text-milsaca-cream/70"
                        style={{ fontFamily: "Inter_400Regular" }}
                      >
                        Prevista {fmtDate(r.data_prevista)}
                        {r.data_paga ? ` · Recebido ${fmtDate(r.data_paga)}` : ""}
                      </Text>
                    </View>
                    <View
                      className="rounded-full px-2 py-1"
                      style={{ backgroundColor: PAGAMENTO_STATUS_BG[r.status] }}
                    >
                      <Text
                        style={{
                          color: PAGAMENTO_STATUS_FG[r.status],
                          fontFamily: "Inter_500Medium",
                          fontSize: 10,
                        }}
                      >
                        {PAGAMENTO_STATUS_LABEL[r.status] ?? r.status}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-3 flex-row items-baseline justify-between">
                    <Text
                      className="text-xs text-milsaca-cream/60"
                      style={{ fontFamily: "Inter_400Regular" }}
                    >
                      Bruto {BRL.format(Number(r.valor_bruto))}
                    </Text>
                    <Text
                      className="text-base text-milsaca-cream"
                      style={{ fontFamily: "Inter_700Bold" }}
                    >
                      {BRL.format(Number(r.valor_liquido))}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Total({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "info" | "success" | "warn";
}) {
  const valueColor =
    tone === "warn" && value > 0
      ? "#fca5a5"
      : tone === "success" && value > 0
        ? "#86efac"
        : "#FAF7F0";
  return (
    <View className="flex-1 rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-3">
      <Text
        className="text-[10px] text-milsaca-cream/60"
        style={{ fontFamily: "Inter_500Medium" }}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          color: valueColor,
          fontSize: 14,
          marginTop: 4,
        }}
      >
        {BRL.format(value)}
      </Text>
    </View>
  );
}
