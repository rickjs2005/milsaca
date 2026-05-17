import { Redirect, Stack } from "expo-router";

import { useAuth } from "../../src/lib/auth";

export default function AuthLayout() {
  const { status } = useAuth();

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
