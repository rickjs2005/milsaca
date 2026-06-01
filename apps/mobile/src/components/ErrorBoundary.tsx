// ErrorBoundary — captura exceções de render na árvore React Native.
//
// Antes disso, uma exceção em render virava tela branca (ou crash duro) sem
// rastro nenhum. Agora a gente captura, loga via `logger.error("render_crash")`
// com o erro sanitizado (sem PII) e mostra um fallback amigável em pt-BR com
// botão de "Tentar de novo" que reseta o boundary (remonta a subárvore).
//
// É um componente de CLASSE de propósito: só classes têm os hooks de ciclo de
// vida de erro (`getDerivedStateFromError` / `componentDidCatch`).

import { Component, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { logger, safeError } from "../lib/logger";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error): void {
    logger.error("render_crash", { err: safeError(error) });
  }

  reset = (): void => {
    this.setState({ hasError: false });
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          backgroundColor: "#2D3A2E",
        }}
      >
        <Text
          style={{
            color: "#FAF7F0",
            fontFamily: "Inter_700Bold",
            fontSize: 20,
            textAlign: "center",
          }}
        >
          Algo deu errado
        </Text>
        <Text
          style={{
            color: "rgba(250,247,240,0.7)",
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            textAlign: "center",
            marginTop: 8,
          }}
        >
          Tivemos um problema ao mostrar essa tela. Você pode tentar de novo.
        </Text>
        <Pressable
          onPress={this.reset}
          style={{
            marginTop: 24,
            backgroundColor: "#C9A961",
            borderRadius: 12,
            paddingHorizontal: 24,
            paddingVertical: 12,
          }}
        >
          <Text
            style={{
              color: "#2D3A2E",
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
            }}
          >
            Tentar de novo
          </Text>
        </Pressable>
      </View>
    );
  }
}
