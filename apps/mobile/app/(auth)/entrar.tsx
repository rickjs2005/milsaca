import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
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

export default function EntrarScreen() {
  const { signInWithOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setError("Digite um email válido.");
      return;
    }
    setSubmitting(true);
    const result = await signInWithOtp(trimmed);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push({
      pathname: "/(auth)/verificar",
      params: { email: trimmed },
    });
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
              Entrar no Milsaca
            </Text>
            <Text
              className="mt-2 text-3xl leading-10 text-milsaca-cream"
              style={{ fontFamily: "Inter_700Bold" }}
            >
              Receba um código{"\n"}por email
            </Text>
            <Text
              className="mt-3 text-sm leading-5 text-milsaca-cream/70"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Vamos enviar um código de 6 dígitos para seu email — sem senha,
              sem complicação.
            </Text>
          </View>

          <View className="mt-10 gap-2">
            <Text
              className="text-xs text-milsaca-cream/60"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              EMAIL
            </Text>
            <TextInput
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError(null);
              }}
              placeholder="voce@exemplo.com"
              placeholderTextColor="rgba(250,247,240,0.35)"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!submitting}
              className="rounded-2xl border border-milsaca-dourado/30 bg-milsaca-verde-claro px-4 py-4 text-base text-milsaca-cream"
              style={{ fontFamily: "Inter_500Medium" }}
            />
            {error ? (
              <Text
                className="mt-1 text-xs text-red-300"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                {error}
              </Text>
            ) : null}
          </View>

          <View className="flex-1" />

          <Pressable
            disabled={submitting}
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
                Enviar código
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
