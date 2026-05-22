import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../../src/lib/auth";

export default function AuthLayout() {
  const { status } = useAuth();

  // Sessão persistida no Keychain pode levar 1-3s pra ser restaurada
  // (chunked storage + refresh token). Sem esse guard, o usuário vê o
  // form de login e clica Entrar enquanto a sessão velha tá chegando.
  if (status === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-milsaca-verde">
        <ActivityIndicator color="#C9A961" />
      </View>
    );
  }

  if (status === "signed_in") {
    return <Redirect href="/(painel)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#2D3A2E" },
      }}
    />
  );
}
