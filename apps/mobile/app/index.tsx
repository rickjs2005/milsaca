import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-milsaca-verde">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6 pb-10 pt-8">
          {/* Header */}
          <View className="flex-row items-center justify-between">
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
            <View className="rounded-full border border-milsaca-dourado/40 px-3 py-1">
              <Text
                className="text-xs text-milsaca-dourado"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                Em construção
              </Text>
            </View>
          </View>

          {/* Hero */}
          <View className="mt-16">
            <Text
              className="text-base text-milsaca-dourado"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              Mercado do café
            </Text>
            <Text
              className="mt-2 text-5xl leading-[52px] text-milsaca-cream"
              style={{ fontFamily: "Inter_700Bold" }}
            >
              Conectamos{"\n"}
              quem produz com{"\n"}
              quem valoriza{"\n"}
              o melhor café.
            </Text>
            <Text
              className="mt-6 text-base leading-6 text-milsaca-cream/80"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Negocie com segurança, transparência e as melhores corretoras do
              Brasil.
            </Text>
          </View>

          {/* Card de boas-vindas */}
          <View className="mt-12 rounded-2xl border border-milsaca-dourado/20 bg-milsaca-verde-claro p-5">
            <Text
              className="text-sm text-milsaca-dourado"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              Mais valor para o seu café
            </Text>
            <Text
              className="mt-2 text-base leading-5 text-milsaca-cream"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Acesse análises de mercado, conecte-se com as melhores corretoras
              e feche negócios com confiança.
            </Text>
          </View>

          <View className="flex-1" />

          {/* CTA */}
          <Pressable
            className="mt-8 items-center rounded-2xl bg-milsaca-dourado px-6 py-4 active:opacity-80"
            onPress={() => {
              // Próximas sprints: navegar para /entrar
            }}
          >
            <Text
              className="text-base text-milsaca-verde"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              Em breve no seu celular
            </Text>
          </Pressable>

          <Text
            className="mt-6 text-center text-xs text-milsaca-cream/50"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            © {new Date().getFullYear()} Milsaca · Mercado do café
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
