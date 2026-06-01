// Tela Início — KPIs por papel ativo.
//
// Produtor: cotação mais recente (qualquer), # propostas em aberto, # contratos ativos.
// Corretora: # leads abertos, # contratos ativos, valor total dos contratos ativos.

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

import { useAuth } from "../../src/lib/auth";
import {
  CONTRATO_STATUS_LABEL,
  LEAD_STATUS_LABEL,
  listCotacoes,
  listMeusContratos,
  listMinhasNegociacoes,
  type ContratoItem,
  type CotacaoRow,
  type LeadItem,
} from "../../src/lib/queries";
import { supabase } from "../../src/lib/supabase";
import { buildWhatsAppUrl } from "../../src/lib/whatsapp";
import { IndicadoresLive } from "../../src/components/IndicadoresLive";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

interface Snapshot {
  cotacao: CotacaoRow | null;
  leadsAbertos: LeadItem[];
  contratosAtivos: ContratoItem[];
  corretoraCasa: { name: string; phone: string | null } | null;
}

export default function InicioScreen() {
  const { profile, signOut } = useAuth();
  const {
    data: snap,
    error,
    refreshing,
    reload,
    onRefresh,
  } = useList<Snapshot>(async () => {
    if (!profile) return;
    const cotacoes = await listCotacoes();
    const cotacao = cotacoes[0] ?? null;

    // Corretora "casa" do produtor (pra botão "Falar Corretora")
    let corretoraCasa: Snapshot["corretoraCasa"] = null;
    if (profile.corretora_id) {
      const { data } = await supabase
        .from("corretoras")
        .select("name, phone")
        .eq("id", profile.corretora_id)
        .maybeSingle();
      if (data) corretoraCasa = data as Snapshot["corretoraCasa"];
    }

    const [leads, contratos] = await Promise.all([
      listMinhasNegociacoes(profile.id),
      listMeusContratos(profile.id),
    ]);
    return {
      cotacao,
      leadsAbertos: leads.filter((l) =>
        ["novo", "em_negociacao"].includes(l.status),
      ),
      contratosAtivos: contratos.filter((c) => c.status === "ativo"),
      corretoraCasa,
    };
  }, [profile]);

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
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-milsaca-dourado">
              <Ionicons name="cafe" size={20} color="#2D3A2E" />
            </View>
            <Text
              className="text-xl text-milsaca-cream"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              Milsaca
            </Text>
          </View>
          <Pressable
            onPress={signOut}
            className="rounded-full border border-milsaca-dourado/40 px-3 py-1 active:opacity-70"
          >
            <Text
              className="text-xs text-milsaca-dourado"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              Sair
            </Text>
          </Pressable>
        </View>

        {/* Saudação */}
        <View className="mt-8">
          <Text
            className="text-sm text-milsaca-dourado"
            style={{ fontFamily: "Inter_500Medium" }}
          >
            Olá, produtor(a)
          </Text>
          <Text
            className="mt-1 text-3xl leading-9 text-milsaca-cream"
            style={{ fontFamily: "Inter_700Bold" }}
          >
            {profile?.full_name?.trim() || "Bem-vindo(a)"}
          </Text>
        </View>

        {/* 3 botões grandes — Ofertar café (CTA principal) + Ver Preço + Falar Corretora */}
        <View className="mt-6 gap-3">
            <Pressable
              onPress={() => router.push("/(painel)/ofertar")}
              className="flex-row items-center gap-3 rounded-2xl bg-milsaca-verde-claro p-5 active:opacity-80"
              style={{
                borderWidth: 2,
                borderColor: "#C9A961",
              }}
            >
              <View className="h-12 w-12 items-center justify-center rounded-full bg-milsaca-dourado">
                <Ionicons name="cafe" size={24} color="#2D3A2E" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base text-milsaca-cream"
                  style={{ fontFamily: "Inter_700Bold" }}
                >
                  Ofertar café
                </Text>
                <Text
                  className="text-xs text-milsaca-cream/70"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  Mande sua oferta direto pra corretora
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FAF7F0" />
            </Pressable>
            <Pressable
              onPress={() => router.push("/(painel)/cotacoes")}
              className="flex-row items-center gap-3 rounded-2xl bg-milsaca-dourado p-5 active:opacity-80"
            >
              <View className="h-12 w-12 items-center justify-center rounded-full bg-milsaca-verde">
                <Ionicons name="trending-up" size={24} color="#C9A961" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base text-milsaca-verde"
                  style={{ fontFamily: "Inter_700Bold" }}
                >
                  Ver preço
                </Text>
                <Text
                  className="text-xs text-milsaca-verde/80"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  Cotação do dia e histórico
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#2D3A2E" />
            </Pressable>
            {snap?.corretoraCasa?.phone ? (
              <Pressable
                onPress={() => {
                  const url = buildWhatsAppUrl(
                    snap.corretoraCasa?.phone ?? null,
                    `Olá ${snap.corretoraCasa?.name ?? ""}, sou ${profile?.full_name ?? "produtor"}.`,
                  );
                  if (url) Linking.openURL(url).catch(() => undefined);
                }}
                className="flex-row items-center gap-3 rounded-2xl bg-milsaca-verde-claro p-5 active:opacity-80"
              >
                <View className="h-12 w-12 items-center justify-center rounded-full bg-milsaca-dourado">
                  <Ionicons name="logo-whatsapp" size={24} color="#2D3A2E" />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-base text-milsaca-cream"
                    style={{ fontFamily: "Inter_700Bold" }}
                  >
                    Falar com corretora
                  </Text>
                  <Text
                    className="text-xs text-milsaca-cream/70"
                    style={{ fontFamily: "Inter_500Medium" }}
                  >
                    {snap.corretoraCasa.name}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FAF7F0" />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push("/(painel)/corretoras")}
                className="flex-row items-center gap-3 rounded-2xl bg-milsaca-verde-claro p-5 active:opacity-80"
              >
                <View className="h-12 w-12 items-center justify-center rounded-full bg-milsaca-dourado">
                  <Ionicons name="business" size={24} color="#2D3A2E" />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-base text-milsaca-cream"
                    style={{ fontFamily: "Inter_700Bold" }}
                  >
                    Ver corretoras
                  </Text>
                  <Text
                    className="text-xs text-milsaca-cream/70"
                    style={{ fontFamily: "Inter_500Medium" }}
                  >
                    Conheça e fale com qualquer corretora cadastrada
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FAF7F0" />
              </Pressable>
            )}
        </View>

        {/* Indicadores ao vivo (lê de market_quotes, populada pela
            edge function sync-cotacoes 21h UTC dias úteis) */}
        <IndicadoresLive />

        {/* Grid de atalhos (telas extras) */}
        <View className="mt-5 flex-row flex-wrap gap-3">
            <Shortcut
              icon="document-text"
              label="Laudos"
              onPress={() => router.push("/(painel)/laudos")}
            />
            <Shortcut
              icon="cube"
              label="Entregas"
              onPress={() => router.push("/(painel)/entregas")}
            />
            <Shortcut
              icon="cash"
              label="Financeiro"
              onPress={() => router.push("/(painel)/financeiro")}
            />
            <Shortcut
              icon="notifications"
              label="Avisos"
              onPress={() => router.push("/(painel)/notificacoes")}
            />
        </View>

        {error ? (
          <View className="mt-12 items-center px-2">
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
        ) : !snap ? (
          <View className="mt-12 items-center">
            <ActivityIndicator color="#C9A961" />
          </View>
        ) : (
          <>
            {/* Card cotação */}
            {snap.cotacao ? (
              <Pressable
                onPress={() => router.push("/(painel)/cotacoes")}
                className="mt-8 rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-5 active:opacity-80"
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    className="text-xs text-milsaca-dourado"
                    style={{ fontFamily: "Inter_500Medium" }}
                  >
                    COTAÇÃO MAIS RECENTE
                  </Text>
                  <Ionicons name="trending-up" size={18} color="#C9A961" />
                </View>
                <Text
                  className="mt-3 text-2xl text-milsaca-cream"
                  style={{ fontFamily: "Inter_700Bold" }}
                >
                  {BRL.format(snap.cotacao.price)}
                </Text>
                <Text
                  className="mt-1 text-xs text-milsaca-cream/70"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {snap.cotacao.coffee_type}
                  {snap.cotacao.region ? ` · ${snap.cotacao.region}` : ""}
                  {snap.cotacao.source ? ` · ${snap.cotacao.source}` : ""}
                </Text>
              </Pressable>
            ) : null}

            {/* Cards de KPI */}
            <View className="mt-4 flex-row gap-3">
              <KpiCard
                label="Propostas abertas"
                value={snap.leadsAbertos.length.toString()}
                icon="chatbubbles"
                onPress={() => router.push("/(painel)/negociacoes")}
              />
              <KpiCard
                label="Contratos ativos"
                value={snap.contratosAtivos.length.toString()}
                icon="document-text"
                onPress={() => router.push("/(painel)/contratos")}
              />
            </View>

            {/* Lista de leads abertos */}
            {snap.leadsAbertos.length > 0 ? (
              <View className="mt-6">
                <Text
                  className="text-xs text-milsaca-dourado"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  PROPOSTAS PENDENTES
                </Text>
                <View className="mt-2 gap-2">
                  {snap.leadsAbertos.slice(0, 3).map((lead) => (
                    <Pressable
                      key={lead.id}
                      onPress={() => router.push("/(painel)/negociacoes")}
                      className="flex-row items-center justify-between rounded-xl bg-milsaca-verde-claro p-3 active:opacity-80"
                    >
                      <View className="flex-1">
                        <Text
                          className="text-sm text-milsaca-cream"
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          {lead.corretora_nome}
                        </Text>
                        <Text
                          className="mt-1 text-xs text-milsaca-cream/60"
                          style={{ fontFamily: "Inter_400Regular" }}
                        >
                          {lead.coffee_type ?? "—"}
                          {lead.bag_count ? ` · ${lead.bag_count} sacas` : ""}
                          {" · "}
                          {LEAD_STATUS_LABEL[lead.status]}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="#C9A961"
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Lista de contratos ativos */}
            {snap.contratosAtivos.length > 0 ? (
              <View className="mt-6">
                <Text
                  className="text-xs text-milsaca-dourado"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  CONTRATOS ATIVOS
                </Text>
                <View className="mt-2 gap-2">
                  {snap.contratosAtivos.slice(0, 3).map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => router.push("/(painel)/contratos")}
                      className="flex-row items-center justify-between rounded-xl bg-milsaca-verde-claro p-3 active:opacity-80"
                    >
                      <View className="flex-1">
                        <Text
                          className="text-sm text-milsaca-cream"
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          {c.code}
                        </Text>
                        <Text
                          className="mt-1 text-xs text-milsaca-cream/60"
                          style={{ fontFamily: "Inter_400Regular" }}
                        >
                          {c.corretora_nome} · {CONTRATO_STATUS_LABEL[c.status]}
                          {c.total_value
                            ? ` · ${BRL.format(c.total_value)}`
                            : ""}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="#C9A961"
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Shortcut({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="w-[47%] flex-grow flex-row items-center gap-2 rounded-xl border border-milsaca-dourado/30 bg-milsaca-verde-claro px-4 py-3 active:opacity-80"
    >
      <Ionicons name={icon} size={16} color="#C9A961" />
      <Text
        className="text-xs text-milsaca-cream"
        style={{ fontFamily: "Inter_500Medium" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function KpiCard({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-4 active:opacity-80"
    >
      <Ionicons name={icon} size={18} color="#C9A961" />
      <Text
        className="mt-3 text-3xl text-milsaca-cream"
        style={{ fontFamily: "Inter_700Bold" }}
      >
        {value}
      </Text>
      <Text
        className="mt-1 text-xs text-milsaca-cream/60"
        style={{ fontFamily: "Inter_500Medium" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
