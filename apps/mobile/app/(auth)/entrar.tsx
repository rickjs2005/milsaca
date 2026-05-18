import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
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

export default function EntrarScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setError("Digite um email válido.");
      return;
    }
    if (!password) {
      setError("Digite sua senha.");
      return;
    }
    setSubmitting(true);
    const result = await signIn(trimmed, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // AuthProvider escuta onAuthStateChange; gate em (painel) assume daqui.
    router.replace("/(painel)/inicio");
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
          <View className="mt-4">
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

            <Text
              className="mt-10 text-base text-milsaca-dourado"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              Entrar
            </Text>
            <Text
              className="mt-2 text-3xl leading-10 text-milsaca-cream"
              style={{ fontFamily: "Inter_700Bold" }}
            >
              Acesse sua conta
            </Text>
          </View>

          <View className="mt-8 gap-4">
            <View className="gap-2">
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
            </View>

            <View className="gap-2">
              <View className="flex-row items-baseline justify-between">
                <Text
                  className="text-xs text-milsaca-cream/60"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  SENHA
                </Text>
                <Link href="/(auth)/esqueci" asChild>
                  <Pressable hitSlop={6}>
                    <Text
                      className="text-xs text-milsaca-dourado"
                      style={{ fontFamily: "Inter_500Medium" }}
                    >
                      Esqueci minha senha
                    </Text>
                  </Pressable>
                </Link>
              </View>
              <TextInput
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                placeholderTextColor="rgba(250,247,240,0.35)"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                editable={!submitting}
                className="rounded-2xl border border-milsaca-dourado/30 bg-milsaca-verde-claro px-4 py-4 text-base text-milsaca-cream"
                style={{ fontFamily: "Inter_500Medium" }}
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

          <Pressable
            disabled={submitting}
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
                Entrar
              </Text>
            )}
          </Pressable>

          <View className="mt-6 flex-row items-center justify-center gap-2">
            <Text
              className="text-sm text-milsaca-cream/70"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Não tem conta?
            </Text>
            <Link href="/(auth)/cadastrar" asChild>
              <Pressable hitSlop={6}>
                <Text
                  className="text-sm text-milsaca-dourado"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  Criar conta
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
