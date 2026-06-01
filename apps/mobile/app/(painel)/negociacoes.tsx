// Tela Negociações — só produtor (mobile não tem painel corretora).
// Lista com filtros pill por status + botão WhatsApp por card.

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  listMinhasPropostas,
  responderProposta,
  type LeadItem,
  type PropostaParaProdutor,
} from "../../src/lib/queries";
import { buildWhatsAppUrl } from "../../src/lib/whatsapp";
import { useList } from "../../src/lib/use-list";
import { logger } from "../../src/lib/logger";
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
  const [respondendoId, setRespondendoId] = useState<string | null>(null);
  const { data, error, refreshing, onRefresh, reload, setData } = useList<{
    leads: LeadItem[];
    propostas: PropostaParaProdutor[];
  }>(async () => {
    if (!profile) return;
    const filterArg = filter === "all" ? {} : { status: filter };
    const [leads, propostas] = await Promise.all([
      listMinhasNegociacoes(profile.id, filterArg),
      listMinhasPropostas(profile.id, { onlyPending: true }),
    ]);
    return { leads, propostas };
  }, [filter, profile]);

  const items = data?.leads ?? null;
  const propostas = data?.propostas ?? null;

  const onResponder = async (
    propostaId: string,
    resposta: "aceita" | "rejeitada",
  ) => {
    setRespondendoId(propostaId);
    const result = await responderProposta(propostaId, resposta);
    setRespondendoId(null);
    if (result.error) {
      // Loga observável (sem PII — só id da proposta + mensagem da RPC) e
      // AVISA o produtor: antes era um console.warn silencioso e o card só
      // ficava parado, parecendo que tinha respondido.
      logger.error("responder_proposta_falhou", {
        propostaId,
        err: result.error,
      });
      Alert.alert(
        "Não foi possível responder",
        `${result.error} Tente de novo.`,
      );
      return;
    }
    // Remove a proposta respondida da lista pendente (optimistic)
    setData((prev) =>
      prev
        ? {
            ...prev,
            propostas: prev.propostas.filter((p) => p.id !== propostaId),
          }
        : prev,
    );
  };

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

        {/* Bloco de propostas pendentes — aparece só quando tem alguma */}
        {propostas && propostas.length > 0 ? (
          <View className="mt-5 gap-3">
            <View className="flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-full bg-milsaca-dourado" />
              <Text
                className="text-xs uppercase tracking-wider text-milsaca-dourado"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Aguardando sua resposta · {propostas.length}
              </Text>
            </View>
            {propostas.map((p) => (
              <PropostaCard
                key={p.id}
                proposta={p}
                respondendo={respondendoId === p.id}
                onAceitar={() => onResponder(p.id, "aceita")}
                onRejeitar={() => onResponder(p.id, "rejeitada")}
              />
            ))}
          </View>
        ) : null}

        {/* Filtros pill */}
        <Text
          className="mt-6 text-xs uppercase tracking-wider text-milsaca-cream/60"
          style={{ fontFamily: "Inter_500Medium" }}
        >
          Histórico
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          className="mt-3 -mx-1 px-1"
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

        {error ? (
          // Falha de carregamento (ex.: listMinhasPropostas relançou): nunca
          // mostramos "vazio" no lugar de um erro. Banner + botão de retry.
          <View className="mt-10 rounded-2xl border border-red-300/30 bg-red-500/10 p-5">
            <Text
              className="text-sm text-red-100"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              Não conseguimos carregar suas negociações.
            </Text>
            <Text
              className="mt-1 text-xs text-milsaca-cream/70"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Verifique sua conexão e tente de novo.
            </Text>
            <Pressable
              onPress={reload}
              className="mt-3 self-start rounded-xl bg-milsaca-dourado px-4 py-2 active:opacity-80"
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

function PropostaCard({
  proposta,
  respondendo,
  onAceitar,
  onRejeitar,
}: {
  proposta: PropostaParaProdutor;
  respondendo: boolean;
  onAceitar: () => void;
  onRejeitar: () => void;
}) {
  const total = proposta.bag_count
    ? proposta.preco_saca * proposta.bag_count
    : null;
  const venceEm = proposta.validade_ate
    ? formatVencimento(proposta.validade_ate)
    : null;

  return (
    <View
      className="rounded-2xl bg-milsaca-verde-claro p-4"
      style={{ borderWidth: 2, borderColor: "#C9A961" }}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className="text-sm text-milsaca-cream"
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          {proposta.corretora_nome}
        </Text>
        <Text
          className="rounded-full bg-milsaca-dourado/20 px-2 py-0.5 text-[10px] text-milsaca-dourado"
          style={{ fontFamily: "Inter_500Medium" }}
        >
          Nova proposta
        </Text>
      </View>

      <View className="mt-3">
        <Text
          className="text-2xl text-milsaca-dourado"
          style={{ fontFamily: "Inter_700Bold" }}
        >
          {BRL.format(proposta.preco_saca)}
          <Text
            className="text-xs text-milsaca-cream/60"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {" "}/sc
          </Text>
        </Text>
        <Text
          className="mt-0.5 text-xs text-milsaca-cream/70"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          {proposta.coffee_type ?? "Café"}
          {proposta.bag_count ? ` · ${proposta.bag_count} sacas` : ""}
          {total ? ` · total ${BRL.format(total)}` : ""}
        </Text>
      </View>

      {proposta.mensagem ? (
        <Text
          className="mt-3 rounded-xl bg-milsaca-verde/40 px-3 py-2 text-xs italic text-milsaca-cream/85"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          “{proposta.mensagem}”
        </Text>
      ) : null}

      {venceEm ? (
        <View className="mt-2 flex-row items-center gap-1">
          <Ionicons name="time-outline" size={12} color="#C9A961" />
          <Text
            className="text-[11px] text-milsaca-dourado"
            style={{ fontFamily: "Inter_500Medium" }}
          >
            {venceEm}
          </Text>
        </View>
      ) : null}

      <View className="mt-4 flex-row gap-2">
        <Pressable
          onPress={onRejeitar}
          disabled={respondendo}
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-red-300/40 bg-red-500/10 py-3 active:opacity-70 disabled:opacity-50"
        >
          <Ionicons name="close-circle-outline" size={16} color="#FCA5A5" />
          <Text
            className="text-sm text-red-200"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            Rejeitar
          </Text>
        </Pressable>
        <Pressable
          onPress={onAceitar}
          disabled={respondendo}
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-milsaca-dourado py-3 active:opacity-80 disabled:opacity-50"
        >
          {respondendo ? (
            <ActivityIndicator color="#2D3A2E" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={16} color="#2D3A2E" />
              <Text
                className="text-sm text-milsaca-verde"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Aceitar
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function formatVencimento(iso: string): string {
  const venceEm = new Date(iso);
  const agora = new Date();
  const diffMs = venceEm.getTime() - agora.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return "Vencida";
  if (diffDias === 0) return "Vence hoje";
  if (diffDias === 1) return "Vence amanhã";
  if (diffDias <= 7) return `Vence em ${diffDias} dias`;
  const dia = String(venceEm.getDate()).padStart(2, "0");
  const mes = String(venceEm.getMonth() + 1).padStart(2, "0");
  return `Vale até ${dia}/${mes}`;
}
