import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useAuth } from "../../src/lib/auth";

export default function PainelLayout() {
  const { status, profile, activeRole, reloadProfile, signOut } = useAuth();

  // Race condition: trigger handle_new_user pode demorar a popular profile.
  // Quando signed_in mas sem profile, faz polling discreto pra evitar tabs vazias.
  useEffect(() => {
    if (status !== "signed_in" || profile) return;
    const t = setInterval(reloadProfile, 1500);
    return () => clearInterval(t);
  }, [status, profile, reloadProfile]);

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

  // Conta acabou de ser criada e o trigger ainda não populou o profile.
  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-milsaca-verde px-6">
        <ActivityIndicator color="#C9A961" />
        <Text
          className="mt-4 text-center text-sm text-milsaca-cream/80"
          style={{ fontFamily: "Inter_500Medium" }}
        >
          Preparando sua conta…
        </Text>
      </View>
    );
  }

  const roles = profile.roles ?? [];

  // Sem nenhum papel — não deveria acontecer, mas se acontecer não trava silencioso.
  if (roles.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-milsaca-verde px-6">
        <Text
          className="text-center text-lg text-milsaca-cream"
          style={{ fontFamily: "Inter_700Bold" }}
        >
          Conta sem perfil definido
        </Text>
        <Text
          className="mt-3 text-center text-sm text-milsaca-cream/70"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          Sua conta foi criada mas ainda não tem produtor nem corretora vinculados. Entre em contato com a corretora que te cadastrou.
        </Text>
        <Pressable
          onPress={signOut}
          className="mt-6 rounded-2xl border border-milsaca-dourado/40 px-5 py-3 active:opacity-70"
        >
          <Text
            className="text-sm text-milsaca-dourado"
            style={{ fontFamily: "Inter_500Medium" }}
          >
            Sair
          </Text>
        </Pressable>
      </View>
    );
  }

  // Mobile é EXCLUSIVO pro produtor. Admin e corretora caem aqui (sem
  // tabs) com mensagem direcionando pro painel web.
  if (activeRole !== "produtor") {
    return (
      <View className="flex-1 items-center justify-center bg-milsaca-verde px-6">
        <Text
          className="text-center text-lg text-milsaca-cream"
          style={{ fontFamily: "Inter_700Bold" }}
        >
          O Milsaca mobile é pra produtor
        </Text>
        <Text
          className="mt-3 text-center text-sm text-milsaca-cream/70"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          {activeRole === "admin"
            ? "Admin opera pelo painel web em milsaca.app/admin."
            : "Sua conta é de corretora. Acesse o painel completo em milsaca.app/painel/corretora pelo navegador."}
        </Text>
        <Pressable
          onPress={signOut}
          className="mt-6 rounded-2xl border border-milsaca-dourado/40 px-5 py-3 active:opacity-70"
        >
          <Text
            className="text-sm text-milsaca-dourado"
            style={{ fontFamily: "Inter_500Medium" }}
          >
            Sair
          </Text>
        </Pressable>
      </View>
    );
  }

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
        name="corretoras"
        options={{
          title: "Corretoras",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="negociacoes"
        options={{
          title: "Negociações",
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
      {/* Telas extras acessíveis via atalhos do Início (sem tab) */}
      <Tabs.Screen name="laudos" options={{ href: null }} />
      <Tabs.Screen name="entregas" options={{ href: null }} />
      <Tabs.Screen name="financeiro" options={{ href: null }} />
      <Tabs.Screen name="notificacoes" options={{ href: null }} />
      <Tabs.Screen name="ofertar" options={{ href: null }} />
    </Tabs>
  );
}
