import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../../src/lib/auth";

export default function PainelLayout() {
  const { status, profile, activeRole } = useAuth();

  if (status === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-milsaca-verde">
        <ActivityIndicator color="#C9A961" />
      </View>
    );
  }

  if (status === "signed_out") {
    return <Redirect href="/(auth)/entrar" />;
  }

  const roles = profile?.roles ?? [];
  if (!activeRole && roles.length > 1) {
    return <Redirect href="/escolher" />;
  }

  const isCorretora = activeRole === "corretora";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#2D3A2E",
          borderTopColor: "rgba(201,169,97,0.2)",
          borderTopWidth: 1,
          height: 70,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: "#C9A961",
        tabBarInactiveTintColor: "rgba(250,247,240,0.45)",
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="inicio"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cotacoes"
        options={{
          title: "Cotações",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="negociacoes"
        options={{
          title: isCorretora ? "Leads" : "Negociações",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contratos"
        options={{
          title: "Contratos",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
