import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Não encontrado" }} />
      <View className="flex-1 items-center justify-center bg-milsaca-verde p-6">
        <Text
          className="text-2xl text-milsaca-cream"
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          Página não encontrada
        </Text>
        <Link href="/" className="mt-4">
          <Text className="text-milsaca-dourado underline">
            Voltar para o início
          </Text>
        </Link>
      </View>
    </>
  );
}
