import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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

export default function CadastrarScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setInfo(null);
    if (!fullName.trim()) {
      setError("Digite seu nome.");
      return;
    }
    if (!email.includes("@")) {
      setError("Digite um email válido.");
      return;
    }
    if (password.length < 8) {
      setError("Senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Senhas não conferem.");
      return;
    }

    setSubmitting(true);
    const result = await signUp({ email, password, fullName });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsConfirmation) {
      setInfo(
        `Conta criada. Confira o link de confirmação no email ${email.trim().toLowerCase()}.`,
      );
      return;
    }
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
              Criar conta
            </Text>
            <Text
              className="mt-2 text-3xl leading-10 text-milsaca-cream"
              style={{ fontFamily: "Inter_700Bold" }}
            >
              Comece como{"\n"}produtor
            </Text>
            <Text
              className="mt-3 text-sm leading-5 text-milsaca-cream/70"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Sua corretora pode te vincular depois.
            </Text>
          </View>

          <View className="mt-8 gap-4">
            <Field
              label="NOME COMPLETO"
              value={fullName}
              onChange={setFullName}
              placeholder="João da Silva"
              autoComplete="name"
              autoCapitalize="words"
              editable={!submitting}
            />
            <Field
              label="EMAIL"
              value={email}
              onChange={setEmail}
              placeholder="voce@exemplo.com"
              autoComplete="email"
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!submitting}
            />
            <Field
              label="SENHA"
              value={password}
              onChange={setPassword}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              autoCapitalize="none"
              secureTextEntry
              textContentType="newPassword"
              editable={!submitting}
            />
            <Field
              label="CONFIRMAR SENHA"
              value={confirm}
              onChange={setConfirm}
              placeholder="Repita a senha"
              autoComplete="new-password"
              autoCapitalize="none"
              secureTextEntry
              textContentType="newPassword"
              editable={!submitting}
            />

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
                Criar conta
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
  autoComplete?: React.ComponentProps<typeof TextInput>["autoComplete"];
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  textContentType?: React.ComponentProps<typeof TextInput>["textContentType"];
  secureTextEntry?: boolean;
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
        autoCapitalize={props.autoCapitalize}
        autoCorrect={false}
        autoComplete={props.autoComplete}
        keyboardType={props.keyboardType}
        textContentType={props.textContentType}
        secureTextEntry={props.secureTextEntry}
        editable={props.editable}
        className="rounded-2xl border border-milsaca-dourado/30 bg-milsaca-verde-claro px-4 py-4 text-base text-milsaca-cream"
        style={{ fontFamily: "Inter_500Medium" }}
      />
    </View>
  );
}
