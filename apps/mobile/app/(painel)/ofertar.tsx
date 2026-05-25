import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  criarOfertaProdutor,
  listCorretorasParaOferta,
  type CorretoraPicker,
} from "../../src/lib/queries";

/**
 * Tela "Ofertar café" — produtor cria um lead na corretora escolhida
 * dizendo "tenho X sacas pra vender". A corretora vê no painel dela
 * (Central de Leads) como lead novo com origem="vitrine".
 *
 * Recebe ?corretora=<id> opcional pra pré-selecionar quando o produtor
 * abre essa tela a partir do detalhe de uma corretora específica.
 */

type Specie = "arabica" | "conillon";
type Processo =
  | "natural"
  | "cd_desmucilado"
  | "despolpado"
  | "fermentacao_induzida";

const SPECIE_OPTS: { value: Specie; label: string }[] = [
  { value: "arabica", label: "Arábica" },
  { value: "conillon", label: "Conillón" },
];

const PROCESSO_OPTS: { value: Processo | null; label: string }[] = [
  { value: null, label: "Não sei" },
  { value: "natural", label: "Natural" },
  { value: "cd_desmucilado", label: "CD desmucilado" },
  { value: "despolpado", label: "Despolpado" },
  { value: "fermentacao_induzida", label: "Fermentação" },
];

function parsePreco(v: string): number | null {
  const cleaned = v.trim().replace(/\./g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseSacas(v: string): number | null {
  const cleaned = v.trim();
  if (!cleaned) return null;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function OfertarScreen() {
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ corretora?: string }>();

  const [corretoras, setCorretoras] = useState<CorretoraPicker[]>([]);
  const [loadingCorretoras, setLoadingCorretoras] = useState(true);
  const [corretoraId, setCorretoraId] = useState<string | null>(
    params.corretora ?? null,
  );

  const [specie, setSpecie] = useState<Specie>("arabica");
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [sacasStr, setSacasStr] = useState("");
  const [precoStr, setPrecoStr] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!profile?.id) return;
    listCorretorasParaOferta(profile.id).then((items) => {
      if (!active) return;
      setCorretoras(items);
      setLoadingCorretoras(false);
      // Auto-seleciona se só tiver 1 favorita ou nenhuma seleção prévia
      if (!corretoraId && items.length === 1 && items[0]) {
        setCorretoraId(items[0].id);
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const corretoraSelecionada = useMemo(
    () => corretoras.find((c) => c.id === corretoraId) ?? null,
    [corretoras, corretoraId],
  );

  const onSubmit = async () => {
    setError(null);
    if (!profile?.id) {
      setError("Sessão expirou. Entre de novo.");
      return;
    }
    if (!corretoraId) {
      setError("Escolha pra qual corretora ofertar.");
      return;
    }
    const sacas = parseSacas(sacasStr);
    if (!sacas) {
      setError("Informe a quantidade de sacas.");
      return;
    }
    const precoAlvo = parsePreco(precoStr); // null = sem preço sugerido

    setSubmitting(true);
    const result = await criarOfertaProdutor({
      corretoraId,
      produtorId: profile.id,
      specie,
      processo,
      bagCount: sacas,
      precoAlvo,
      observacoes: observacoes.trim() || null,
    });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    // Sucesso — volta pra tela inicial com mensagem implícita
    router.replace("/(painel)/negociacoes");
  };

  return (
    <SafeAreaView className="flex-1 bg-milsaca-verde">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 8 }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-milsaca-verde-claro active:opacity-80"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color="#FAF7F0" />
          </Pressable>

          <View className="mt-4">
            <Text
              className="text-base text-milsaca-dourado"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              Ofertar café
            </Text>
            <Text
              className="mt-2 text-3xl leading-10 text-milsaca-cream"
              style={{ fontFamily: "Inter_700Bold" }}
            >
              Tenho café{"\n"}pra vender
            </Text>
            <Text
              className="mt-3 text-sm leading-5 text-milsaca-cream/70"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              A corretora escolhida recebe sua oferta como lead novo e te
              contata pra fechar o detalhe.
            </Text>
          </View>

          {/* Corretora destinatária */}
          <View className="mt-8 gap-2">
            <Text
              className="text-xs text-milsaca-cream/60"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              CORRETORA
            </Text>
            {loadingCorretoras ? (
              <View className="rounded-2xl border border-milsaca-dourado/30 bg-milsaca-verde-claro p-4">
                <ActivityIndicator color="#C9A961" />
              </View>
            ) : corretoras.length === 0 ? (
              <View className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4">
                <Text
                  className="text-sm text-amber-100"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  Nenhuma corretora disponível ainda. Volte mais tarde.
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {corretoras.slice(0, 8).map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setCorretoraId(c.id)}
                    className={
                      corretoraId === c.id
                        ? "rounded-2xl border-2 border-milsaca-dourado bg-milsaca-verde-claro p-4 active:opacity-80"
                        : "rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro/60 p-4 active:opacity-80"
                    }
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text
                            className="text-base text-milsaca-cream"
                            style={{ fontFamily: "Inter_600SemiBold" }}
                          >
                            {c.name}
                          </Text>
                          {c.favorita ? (
                            <Ionicons name="star" size={12} color="#C9A961" />
                          ) : null}
                          {c.verified ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={12}
                              color="#C9A961"
                            />
                          ) : null}
                        </View>
                        {c.city ? (
                          <Text
                            className="mt-0.5 text-xs text-milsaca-cream/60"
                            style={{ fontFamily: "Inter_400Regular" }}
                          >
                            {c.city}
                            {c.state ? ` / ${c.state}` : ""}
                          </Text>
                        ) : null}
                      </View>
                      {corretoraId === c.id ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#C9A961"
                        />
                      ) : null}
                    </View>
                  </Pressable>
                ))}
                {corretoras.length > 8 ? (
                  <Text
                    className="text-xs text-milsaca-cream/40"
                    style={{ fontFamily: "Inter_400Regular" }}
                  >
                    Mostrando 8 de {corretoras.length}. As favoritas aparecem
                    primeiro.
                  </Text>
                ) : null}
              </View>
            )}
          </View>

          {/* Espécie do café */}
          <View className="mt-6 gap-2">
            <Text
              className="text-xs text-milsaca-cream/60"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              TIPO DE CAFÉ
            </Text>
            <View className="flex-row gap-2">
              {SPECIE_OPTS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setSpecie(opt.value)}
                  className={
                    specie === opt.value
                      ? "flex-1 rounded-2xl border-2 border-milsaca-dourado bg-milsaca-verde-claro py-3 active:opacity-80"
                      : "flex-1 rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro/60 py-3 active:opacity-80"
                  }
                >
                  <Text
                    className="text-center text-sm text-milsaca-cream"
                    style={{ fontFamily: "Inter_500Medium" }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Processo */}
          <View className="mt-4 gap-2">
            <Text
              className="text-xs text-milsaca-cream/60"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              PROCESSO
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {PROCESSO_OPTS.map((opt) => (
                <Pressable
                  key={opt.label}
                  onPress={() => setProcesso(opt.value)}
                  className={
                    processo === opt.value
                      ? "rounded-full border-2 border-milsaca-dourado bg-milsaca-verde-claro px-3 py-2 active:opacity-80"
                      : "rounded-full border border-milsaca-dourado/20 bg-milsaca-verde-claro/60 px-3 py-2 active:opacity-80"
                  }
                >
                  <Text
                    className="text-xs text-milsaca-cream"
                    style={{ fontFamily: "Inter_500Medium" }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Sacas + preço */}
          <View className="mt-4 gap-4">
            <Field
              label="SACAS (60 KG) *"
              value={sacasStr}
              onChange={setSacasStr}
              placeholder="100"
              keyboardType="number-pad"
              editable={!submitting}
            />
            <Field
              label="PREÇO ALVO POR SACA (OPCIONAL)"
              value={precoStr}
              onChange={setPrecoStr}
              placeholder="1.850,00"
              keyboardType="decimal-pad"
              editable={!submitting}
            />

            <View className="gap-2">
              <Text
                className="text-xs text-milsaca-cream/60"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                OBSERVAÇÕES
              </Text>
              <TextInput
                value={observacoes}
                onChangeText={setObservacoes}
                placeholder="Ex: safra 2024, fazenda no Caparaó, peneira 17/18..."
                placeholderTextColor="rgba(250,247,240,0.35)"
                multiline
                numberOfLines={3}
                editable={!submitting}
                className="rounded-2xl border border-milsaca-dourado/30 bg-milsaca-verde-claro px-4 py-3 text-base text-milsaca-cream"
                style={{
                  fontFamily: "Inter_400Regular",
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
              />
            </View>

            {error ? (
              <Text
                className="text-xs text-red-300"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                {error}
              </Text>
            ) : null}
          </View>

          {/* Resumo + submit */}
          {corretoraSelecionada ? (
            <View className="mt-6 rounded-2xl border border-milsaca-dourado/30 bg-milsaca-verde-claro/40 p-4">
              <Text
                className="text-[10px] uppercase tracking-wider text-milsaca-dourado"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Confirmação
              </Text>
              <Text
                className="mt-1 text-sm leading-5 text-milsaca-cream"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                Vai aparecer pra{" "}
                <Text style={{ fontFamily: "Inter_600SemiBold" }}>
                  {corretoraSelecionada.name}
                </Text>{" "}
                como lead novo. Ela vai te contatar pra confirmar os detalhes.
              </Text>
            </View>
          ) : null}

          <Pressable
            disabled={submitting || corretoras.length === 0}
            onPress={onSubmit}
            className="mt-6 items-center justify-center rounded-2xl bg-milsaca-dourado py-4 active:opacity-80 disabled:opacity-50"
          >
            {submitting ? (
              <ActivityIndicator color="#2D3A2E" />
            ) : (
              <Text
                className="text-base text-milsaca-verde"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Enviar oferta
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  editable?: boolean;
};

function Field(props: FieldProps) {
  return (
    <View className="gap-2">
      <Text
        className="text-xs text-milsaca-cream/60"
        style={{ fontFamily: "Inter_500Medium" }}
      >
        {props.label}
      </Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChange}
        placeholder={props.placeholder}
        placeholderTextColor="rgba(250,247,240,0.35)"
        keyboardType={props.keyboardType}
        editable={props.editable}
        className="rounded-2xl border border-milsaca-dourado/30 bg-milsaca-verde-claro px-4 py-4 text-base text-milsaca-cream"
        style={{ fontFamily: "Inter_400Regular" }}
      />
    </View>
  );
}
