/**
 * Modo de cotações da plataforma.
 *
 * - `real`  (default): mostra apenas cotações reais — automáticas (CEPEA,
 *   ICE, PTAX) coletadas pelo cron sync-cotacoes + manuais cadastradas
 *   por admin/corretora. Nenhum mock, seed fake ou fallback inventado
 *   pode aparecer na UI do produtor.
 * - `demo`: permite seed local pra demonstrar fluxos sem dados reais.
 *   Badge "Demonstração" obrigatório nas telas que mostram cotações.
 *
 * Variáveis lidas (server side):
 *   - `QUOTES_MODE`            (server)
 *   - `NEXT_PUBLIC_QUOTES_MODE` (client — espelha o valor pra render
 *     do badge sem virar prop drilling)
 *
 * Default é `real` quando nenhuma var está setada — produção é segura
 * por construção.
 */

export type QuotesMode = "real" | "demo";

export function quotesMode(): QuotesMode {
  const raw =
    process.env.QUOTES_MODE ??
    process.env.NEXT_PUBLIC_QUOTES_MODE ??
    "real";
  return raw === "demo" ? "demo" : "real";
}

export function isDemoMode(): boolean {
  return quotesMode() === "demo";
}

/**
 * Lança erro se for chamada em modo real. Use em scripts de seed/mock
 * pra impedir execução acidental em produção.
 */
export function assertDemoMode(context: string): void {
  if (quotesMode() !== "demo") {
    throw new Error(
      `${context} requer QUOTES_MODE=demo. Modo atual = ${quotesMode()}. Recusando execução pra não poluir banco real.`,
    );
  }
}
