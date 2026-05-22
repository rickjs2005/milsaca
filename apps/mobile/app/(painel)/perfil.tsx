// Tela Perfil — edita profile (+ fazenda se produtor).
// Paridade com /painel/produtor/perfil e /painel/corretora/perfil (modo limitado).

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../src/lib/auth";
import {
  getProdutorFazenda,
  type ProdutorFazenda,
} from "../../src/lib/queries";
import { supabase } from "../../src/lib/supabase";

interface ProfileForm {
  full_name: string;
  phone: string;
}

interface FazendaForm {
  fazenda_nome: string;
  city: string;
  state: string;
  area_ha: string;
  altitude_m: string;
}

const EMPTY_FAZENDA: FazendaForm = {
  fazenda_nome: "",
  city: "",
  state: "",
  area_ha: "",
  altitude_m: "",
};

export default function PerfilScreen() {
  const { user, profile, activeRole, signOut, setActiveRole, reloadProfile } =
    useAuth();
  const [pf, setPf] = useState<ProfileForm>({ full_name: "", phone: "" });
  const [fz, setFz] = useState<FazendaForm>(EMPTY_FAZENDA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const isProdutor = activeRole === "produtor";
  const isCorretora = activeRole === "corretora";
  const hasMultiRole = (profile?.roles?.length ?? 0) > 1;

  const load = useCallback(async () => {
    if (!profile) return;
    setPf({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
    });
    if (isProdutor) {
      const fz = await getProdutorFazenda(profile.id);
      hydrateFazenda(setFz, fz);
    }
    setLoading(false);
  }, [profile, isProdutor]);

  useEffect(() => {
    load();
  }, [load]);

  // Roles podem ter mudado fora do app (admin promoveu o user a corretora).
  // Refresh ao montar pra mostrar botão "Trocar painel" se ganhou multi-role.
  useEffect(() => {
    reloadProfile();
  }, [reloadProfile]);

  const onSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSavedMsg(null);

    const profilePayload = {
      full_name: pf.full_name.trim() || null,
      phone: pf.phone.trim() || null,
    };
    const { error: pErr } = await supabase
      .from("profiles")
      .update(profilePayload)
      .eq("id", profile.id);

    if (pErr) {
      setSaving(false);
      Alert.alert("Erro", pErr.message);
      return;
    }

    if (isProdutor) {
      const area = fz.area_ha.trim() ? Number(fz.area_ha.replace(",", ".")) : null;
      const alt = fz.altitude_m.trim()
        ? Number(fz.altitude_m.replace(",", "."))
        : null;

      const { error: fErr } = await supabase
        .from("produtores")
        .upsert(
          {
            profile_id: profile.id,
            fazenda_nome: fz.fazenda_nome.trim() || null,
            city: fz.city.trim() || null,
            state: fz.state.trim() || null,
            area_ha: Number.isFinite(area) ? area : null,
            altitude_m: Number.isFinite(alt) ? alt : null,
          },
          { onConflict: "profile_id" },
        );
      if (fErr) {
        setSaving(false);
        Alert.alert("Erro ao salvar fazenda", fErr.message);
        return;
      }
    }

    setSaving(false);
    setSavedMsg("Salvo!");
    await reloadProfile();
    setTimeout(() => setSavedMsg(null), 2500);
  };

  return (
    <SafeAreaView className="flex-1 bg-milsaca-verde" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            className="text-base text-milsaca-dourado"
            style={{ fontFamily: "Inter_500Medium" }}
          >
            Conta
          </Text>
          <Text
            className="mt-1 text-2xl text-milsaca-cream"
            style={{ fontFamily: "Inter_700Bold" }}
          >
            Meu perfil
          </Text>

          {loading || !profile ? (
            <View className="mt-12 items-center">
              <ActivityIndicator color="#C9A961" />
            </View>
          ) : (
            <>
              {/* Card dados pessoais */}
              <View className="mt-6 rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-5">
                <Text
                  className="text-xs text-milsaca-dourado"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  DADOS PESSOAIS
                </Text>

                <Field label="Email">
                  <Text
                    className="text-sm text-milsaca-cream/70"
                    style={{ fontFamily: "Inter_500Medium" }}
                  >
                    {user?.email ?? "—"}
                  </Text>
                </Field>

                <Field label="Nome completo">
                  <TextInput
                    value={pf.full_name}
                    onChangeText={(v) => setPf((s) => ({ ...s, full_name: v }))}
                    placeholder="Seu nome"
                    placeholderTextColor="rgba(250,247,240,0.35)"
                    className="rounded-xl bg-milsaca-verde/40 px-3 py-3 text-sm text-milsaca-cream"
                    style={{ fontFamily: "Inter_500Medium" }}
                    editable={!saving}
                  />
                </Field>

                <Field label="Telefone (WhatsApp)">
                  <TextInput
                    value={pf.phone}
                    onChangeText={(v) => setPf((s) => ({ ...s, phone: v }))}
                    placeholder="(33) 99999-9999"
                    placeholderTextColor="rgba(250,247,240,0.35)"
                    keyboardType="phone-pad"
                    className="rounded-xl bg-milsaca-verde/40 px-3 py-3 text-sm text-milsaca-cream"
                    style={{ fontFamily: "Inter_500Medium" }}
                    editable={!saving}
                  />
                </Field>
              </View>

              {/* Card fazenda (só produtor) */}
              {isProdutor ? (
                <View className="mt-4 rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-5">
                  <Text
                    className="text-xs text-milsaca-dourado"
                    style={{ fontFamily: "Inter_500Medium" }}
                  >
                    FAZENDA
                  </Text>
                  <Field label="Nome da fazenda">
                    <TextInput
                      value={fz.fazenda_nome}
                      onChangeText={(v) =>
                        setFz((s) => ({ ...s, fazenda_nome: v }))
                      }
                      placeholder="Sítio do Café"
                      placeholderTextColor="rgba(250,247,240,0.35)"
                      className="rounded-xl bg-milsaca-verde/40 px-3 py-3 text-sm text-milsaca-cream"
                      style={{ fontFamily: "Inter_500Medium" }}
                      editable={!saving}
                    />
                  </Field>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Field label="Cidade">
                        <TextInput
                          value={fz.city}
                          onChangeText={(v) => setFz((s) => ({ ...s, city: v }))}
                          placeholder="Manhuaçu"
                          placeholderTextColor="rgba(250,247,240,0.35)"
                          className="rounded-xl bg-milsaca-verde/40 px-3 py-3 text-sm text-milsaca-cream"
                          style={{ fontFamily: "Inter_500Medium" }}
                          editable={!saving}
                        />
                      </Field>
                    </View>
                    <View className="w-20">
                      <Field label="UF">
                        <TextInput
                          value={fz.state}
                          onChangeText={(v) =>
                            setFz((s) => ({ ...s, state: v.toUpperCase().slice(0, 2) }))
                          }
                          placeholder="MG"
                          placeholderTextColor="rgba(250,247,240,0.35)"
                          autoCapitalize="characters"
                          maxLength={2}
                          className="rounded-xl bg-milsaca-verde/40 px-3 py-3 text-sm text-milsaca-cream"
                          style={{ fontFamily: "Inter_500Medium" }}
                          editable={!saving}
                        />
                      </Field>
                    </View>
                  </View>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Field label="Área (ha)">
                        <TextInput
                          value={fz.area_ha}
                          onChangeText={(v) =>
                            setFz((s) => ({ ...s, area_ha: v }))
                          }
                          placeholder="12"
                          placeholderTextColor="rgba(250,247,240,0.35)"
                          keyboardType="decimal-pad"
                          className="rounded-xl bg-milsaca-verde/40 px-3 py-3 text-sm text-milsaca-cream"
                          style={{ fontFamily: "Inter_500Medium" }}
                          editable={!saving}
                        />
                      </Field>
                    </View>
                    <View className="flex-1">
                      <Field label="Altitude (m)">
                        <TextInput
                          value={fz.altitude_m}
                          onChangeText={(v) =>
                            setFz((s) => ({ ...s, altitude_m: v }))
                          }
                          placeholder="900"
                          placeholderTextColor="rgba(250,247,240,0.35)"
                          keyboardType="decimal-pad"
                          className="rounded-xl bg-milsaca-verde/40 px-3 py-3 text-sm text-milsaca-cream"
                          style={{ fontFamily: "Inter_500Medium" }}
                          editable={!saving}
                        />
                      </Field>
                    </View>
                  </View>
                </View>
              ) : null}

              {isCorretora ? (
                <View className="mt-4 rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-5">
                  <Text
                    className="text-xs text-milsaca-dourado"
                    style={{ fontFamily: "Inter_500Medium" }}
                  >
                    CORRETORA
                  </Text>
                  <Text
                    className="mt-2 text-sm text-milsaca-cream/80"
                    style={{ fontFamily: "Inter_400Regular" }}
                  >
                    Os dados da empresa só são editáveis pelo administrador.
                    Fale com a equipe Milsaca pra alterar nome, slug ou cidade.
                  </Text>
                </View>
              ) : null}

              {/* Salvar */}
              <Pressable
                disabled={saving}
                onPress={onSave}
                className="mt-6 items-center justify-center rounded-2xl bg-milsaca-dourado py-4 active:opacity-80 disabled:opacity-50"
              >
                {saving ? (
                  <ActivityIndicator color="#2D3A2E" />
                ) : (
                  <Text
                    className="text-base text-milsaca-verde"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    Salvar
                  </Text>
                )}
              </Pressable>
              {savedMsg ? (
                <Text
                  className="mt-2 text-center text-xs text-milsaca-dourado"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  {savedMsg}
                </Text>
              ) : null}

              {/* Status da conta (sempre visível pra ajudar o user a saber
                  quais papéis tem; aparece dropdown "Trocar painel" se 2+) */}
              <View className="mt-4 rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-5">
                <Text
                  className="text-xs text-milsaca-dourado"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  PAPÉIS DA CONTA
                </Text>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {(profile?.roles ?? []).map((r) => (
                    <View
                      key={r}
                      className={
                        r === activeRole
                          ? "rounded-full bg-milsaca-dourado px-3 py-1"
                          : "rounded-full border border-milsaca-dourado/30 px-3 py-1"
                      }
                    >
                      <Text
                        className={
                          r === activeRole
                            ? "text-xs text-milsaca-verde"
                            : "text-xs text-milsaca-cream"
                        }
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        {r === "produtor"
                          ? "Produtor"
                          : r === "corretora"
                            ? "Corretora"
                            : r}
                        {r === activeRole ? " · ativo" : ""}
                      </Text>
                    </View>
                  ))}
                  {(profile?.roles?.length ?? 0) === 0 ? (
                    <Text
                      className="text-xs italic text-milsaca-cream/60"
                      style={{ fontFamily: "Inter_400Regular" }}
                    >
                      Sem papéis definidos
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={async () => {
                    await reloadProfile();
                    setSavedMsg("Conta atualizada");
                    setTimeout(() => setSavedMsg(null), 2500);
                  }}
                  className="mt-3 flex-row items-center gap-1.5 self-start active:opacity-60"
                >
                  <Ionicons name="refresh" size={12} color="#C9A961" />
                  <Text
                    className="text-[11px] text-milsaca-dourado"
                    style={{ fontFamily: "Inter_500Medium" }}
                  >
                    Atualizar
                  </Text>
                </Pressable>
              </View>

              {/* Trocar painel */}
              {hasMultiRole ? (
                <Pressable
                  onPress={async () => {
                    await setActiveRole(
                      isProdutor ? "corretora" : "produtor",
                    );
                  }}
                  className="mt-4 items-center rounded-2xl border border-milsaca-dourado/30 py-3 active:opacity-70"
                >
                  <Text
                    className="text-sm text-milsaca-dourado"
                    style={{ fontFamily: "Inter_500Medium" }}
                  >
                    Trocar para painel{" "}
                    {isProdutor ? "da corretora" : "do produtor"}
                  </Text>
                </Pressable>
              ) : null}

              {/* Sair */}
              <Pressable
                onPress={signOut}
                className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl border border-milsaca-dourado/30 py-3 active:opacity-70"
              >
                <Ionicons name="log-out-outline" size={16} color="#C9A961" />
                <Text
                  className="text-sm text-milsaca-dourado"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  Sair
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-3 gap-1">
      <Text
        className="text-[11px] text-milsaca-cream/60"
        style={{ fontFamily: "Inter_500Medium" }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

function hydrateFazenda(
  set: (s: FazendaForm) => void,
  fz: ProdutorFazenda | null,
) {
  if (!fz) {
    set(EMPTY_FAZENDA);
    return;
  }
  set({
    fazenda_nome: fz.fazenda_nome ?? "",
    city: fz.city ?? "",
    state: fz.state ?? "",
    area_ha: fz.area_ha != null ? String(fz.area_ha) : "",
    altitude_m: fz.altitude_m != null ? String(fz.altitude_m) : "",
  });
}
