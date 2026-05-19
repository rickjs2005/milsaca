import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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

/**
 * Tela de confirmação de email via OTP de 6 dígitos.
 *
 * Disparada após /(auth)/cadastrar quando o Supabase exige confirmação.
 * Usa código numérico em vez de magic link porque o Gmail Safe Links
 * faz prefetch e queima links one-time-use no Brasil.
 */
export default function ConfirmarScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const initialEmail = (params.email ?? "").toString().trim().toLowerCase();

  const { confirmEmail, resendConfirmation } = useAuth();
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setInfo(null);
    const code = token.replace(/\D/g, "");
    if (code.length !== 6) {
      setError("Código tem 6 dígitos.");
      return;
    }
    setSubmitting(true);
    const result = await confirmEmail(initialEmail, code);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // Sessão criada pelo verifyOtp → AuthProvider escuta e redireciona
    router.replace("/(painel)/inicio");
  };

  const onResend = async () => {
    setError(null);
    setInfo(null);
    setResending(true);
    const result = await resendConfirmation(initialEmail);
    setResending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setInfo("Novo código enviado. Confira seu email.");
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

          <View className="mt-8">
            <Text
              className="text-base text-milsaca-dourado"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              Confirmar email
            </Text>
            <Text
              className="mt-2 text-3xl leading-10 text-milsaca-cream"
              style={{ fontFamily: "Inter_700Bold" }}
            >
              Digite o código
            </Text>
            <Text
              className="mt-3 text-sm leading-5 text-milsaca-cream/70"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Enviamos 6 dígitos pra{" "}
              <Text
                style={{ fontFamily: "Inter_600SemiBold" }}
                className="text-milsaca-cream"
              >
                {initialEmail || "seu email"}
              </Text>
              . Cheque também o spam.
            </Text>
          </View>

          <View className="mt-8 gap-3">
            <Text
              className="text-xs text-milsaca-cream/60"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              CÓDIGO
            </Text>
            <TextInput
              value={token}
              onChangeText={(v) => setToken(v.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              placeholderTextColor="rgba(250,247,240,0.35)"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              editable={!submitting && !resending}
              className="rounded-2xl border border-milsaca-dourado/30 bg-milsaca-verde-claro px-4 py-4 text-center text-2xl tracking-widest text-milsaca-cream"
              style={{ fontFamily: "Inter_700Bold" }}
            />
            <Text
              className="text-[11px] text-milsaca-cream/50"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              O código expira em 1 hora.
            </Text>

            {error ? (
              <Text
                className="text-xs text-red-300"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                {error}
              </Text>
            ) : null}
            {info ? (
              <Text
                className="text-xs text-milsaca-dourado"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                {info}
              </Text>
            ) : null}
          </View>

          <Pressable
            disabled={submitting || resending}
            onPress={onSubmit}
            className="mt-8 items-center justify-center rounded-2xl bg-milsaca-dourado py-4 active:opacity-80 disabled:opacity-50"
          >
            {submitting ? (
              <ActivityIndicator color="#2D3A2E" />
            ) : (
              <Text
                className="text-base text-milsaca-verde"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Confirmar
              </Text>
            )}
          </Pressable>

          <Pressable
            disabled={submitting || resending}
            onPress={onResend}
            className="mt-3 items-center justify-center rounded-2xl border border-milsaca-dourado/40 py-4 active:opacity-80 disabled:opacity-50"
          >
            {resending ? (
              <ActivityIndicator color="#C9A961" />
            ) : (
              <Text
                className="text-sm text-milsaca-dourado"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                Reenviar código
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
