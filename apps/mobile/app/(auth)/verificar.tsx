import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../src/lib/auth";

export default function VerificarScreen() {
  const { signInWithOtp, verifyOtp } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = (params.email ?? "").toString();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const onSubmit = async () => {
    setError(null);
    setInfo(null);
    if (code.length !== 6) {
      setError("Digite os 6 dígitos do código.");
      return;
    }
    setSubmitting(true);
    const result = await verifyOtp(email, code);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // O AuthProvider escuta onAuthStateChange e o gate em /(painel)
    // assume daqui. Direcionamos pra tab default pra encurtar uma renderização.
    router.replace("/(painel)/inicio");
  };

  const onResend = async () => {
    setError(null);
    setInfo(null);
    setResending(true);
    const result = await signInWithOtp(email);
    setResending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setInfo("Novo código enviado.");
  };

  return (
    <SafeAreaView className="flex-1 bg-milsaca-verde">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 px-6 pt-6">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-milsaca-verde-claro active:opacity-80"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color="#FAF7F0" />
          </Pressable>

          <View className="mt-10">
            <Text
              className="text-base text-milsaca-dourado"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              Confirmar código
            </Text>
            <Text
              className="mt-2 text-3xl leading-10 text-milsaca-cream"
              style={{ fontFamily: "Inter_700Bold" }}
            >
              Digite o código{"\n"}que mandamos
            </Text>
            <Text
              className="mt-3 text-sm leading-5 text-milsaca-cream/70"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Enviamos um código de 6 dígitos para{" "}
              <Text
                className="text-milsaca-cream"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                {email || "seu email"}
              </Text>
              . Pode levar até 1 minuto pra chegar.
            </Text>
          </View>

          <View className="mt-10 gap-2">
            <Text
              className="text-xs text-milsaca-cream/60"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              CÓDIGO DE 6 DÍGITOS
            </Text>
            <Pressable onPress={() => inputRef.current?.focus()}>
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={(t) => {
                  const onlyDigits = t.replace(/\D/g, "").slice(0, 6);
                  setCode(onlyDigits);
                  if (error) setError(null);
                }}
                placeholder="000000"
                placeholderTextColor="rgba(250,247,240,0.25)"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={6}
                editable={!submitting}
                className="rounded-2xl border border-milsaca-dourado/30 bg-milsaca-verde-claro py-5 text-center text-3xl tracking-[10px] text-milsaca-cream"
                style={{ fontFamily: "Inter_700Bold" }}
              />
            </Pressable>
            {error ? (
              <Text
                className="mt-1 text-xs text-red-300"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                {error}
              </Text>
            ) : null}
            {info ? (
              <Text
                className="mt-1 text-xs text-milsaca-dourado"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                {info}
              </Text>
            ) : null}
          </View>

          <Pressable
            disabled={resending}
            onPress={onResend}
            className="mt-4 self-start active:opacity-60"
          >
            <Text
              className="text-sm text-milsaca-dourado"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              {resending ? "Reenviando…" : "Não recebi — reenviar código"}
            </Text>
          </Pressable>

          <View className="flex-1" />

          <Pressable
            disabled={submitting || code.length !== 6}
            onPress={onSubmit}
            className="mb-6 items-center justify-center rounded-2xl bg-milsaca-dourado py-4 active:opacity-80 disabled:opacity-50"
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
