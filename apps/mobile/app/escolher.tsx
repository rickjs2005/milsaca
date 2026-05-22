import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../src/lib/auth";
import type { UserRole } from "@milsaca/types";

// Admin não aparece no mobile — admin opera pelo painel web em milsaca.app/admin.
// Se o user tiver SÓ role admin, /(painel)/_layout mostra mensagem "use o web".
const ROLES: {
  role: UserRole;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    role: "produtor",
    title: "Sou produtor",
    description: "Veja cotações, propostas e contratos da sua fazenda.",
    icon: "leaf",
  },
  {
    role: "corretora",
    title: "Sou corretora",
    description: "Gerencie produtores, leads e contratos da operação.",
    icon: "briefcase",
  },
];

export default function EscolherScreen() {
  const { status, profile, setActiveRole, reloadProfile } = useAuth();

  // Roles podem ter sido alteradas pelo admin enquanto o app estava aberto
  // (ex: produtor virou também corretora). Recarrega fresh ao abrir.
  useEffect(() => {
    reloadProfile();
  }, [reloadProfile]);

  if (status === "signed_out") return <Redirect href="/(auth)/entrar" />;
  if (status === "loading") return null;

  const roles = profile?.roles ?? [];
  if (roles.length <= 1) return <Redirect href="/(painel)/inicio" />;

  const options = ROLES.filter((r) => roles.includes(r.role));

  return (
    <SafeAreaView className="flex-1 bg-milsaca-verde">
      <View className="flex-1 px-6 pt-12">
        <Text
          className="text-base text-milsaca-dourado"
          style={{ fontFamily: "Inter_500Medium" }}
        >
          Quase lá
        </Text>
        <Text
          className="mt-2 text-3xl leading-10 text-milsaca-cream"
          style={{ fontFamily: "Inter_700Bold" }}
        >
          Como você vai{"\n"}usar o Milsaca hoje?
        </Text>
        <Text
          className="mt-3 text-sm leading-5 text-milsaca-cream/70"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          Sua conta tem mais de um papel. Você pode trocar a qualquer momento
          pelo botão “Trocar painel”.
        </Text>

        <View className="mt-8 gap-3">
          {options.map((opt) => (
            <Pressable
              key={opt.role}
              onPress={async () => {
                await setActiveRole(opt.role);
                router.replace("/(painel)/inicio");
              }}
              className="flex-row items-center gap-4 rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-4 active:opacity-80"
            >
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-milsaca-dourado">
                <Ionicons name={opt.icon} size={22} color="#2D3A2E" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base text-milsaca-cream"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  {opt.title}
                </Text>
                <Text
                  className="mt-1 text-xs leading-4 text-milsaca-cream/70"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {opt.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C9A961" />
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
