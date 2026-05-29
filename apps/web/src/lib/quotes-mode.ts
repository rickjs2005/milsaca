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
 * Fontes de verdade (em ordem de precedência):
 *   1. `platform_settings.quotes_mode` (hot-swappable — admin troca sem
 *      redeploy, lido via RPC pública `get_quotes_mode()`).
 *   2. `QUOTES_MODE` / `NEXT_PUBLIC_QUOTES_MODE` (env — fallback).
 *   3. `real` (default seguro por construção).
 *
 * `quotesModeAsync()` é o caminho recomendado no runtime server (lê a
 * flag do banco). `quotesMode()` (sync, só env) é mantido pra scripts e
 * pra contextos que não podem fazer await (ex.: o assert de seed).
 */

import { createClient } from "@milsaca/db/web/server";

export type QuotesMode = "real" | "demo";

function normalize(raw: string | null | undefined): QuotesMode {
  return raw === "demo" ? "demo" : "real";
}

/**
 * Modo a partir das env vars apenas (síncrono). Default `real`.
 */
export function quotesMode(): QuotesMode {
  return normalize(
    process.env.QUOTES_MODE ?? process.env.NEXT_PUBLIC_QUOTES_MODE ?? "real",
  );
}

/**
 * Modo hot-swappable: tenta a flag em `platform_settings` (via RPC
 * pública `get_quotes_mode`); se a RPC falhar ou vier vazia, cai pro
 * valor de env e, por fim, `real`. Nunca lança.
 */
export async function quotesModeAsync(): Promise<QuotesMode> {
  try {
    const supabase = await createClient();
    // RPC pública (platform_settings tem RLS admin-only). Cast localizado
    // porque a RPC é nova e os tipos gerados ainda não a conhecem.
    const { data, error } = await (
      supabase.rpc as unknown as (
        fn: string,
      ) => Promise<{ data: string | null; error: unknown }>
    )("get_quotes_mode");
    if (!error && data) {
      return normalize(String(data));
    }
  } catch {
    // ignora — fallback abaixo
  }
  return quotesMode();
}

export function isDemoMode(): boolean {
  return quotesMode() === "demo";
}

/**
 * Versão async do gate de demo, lendo a flag do banco.
 */
export async function isDemoModeAsync(): Promise<boolean> {
  return (await quotesModeAsync()) === "demo";
}

/**
 * Lança erro se for chamada em modo real. Use em scripts de seed/mock
 * pra impedir execução acidental em produção. Síncrono (env-only) de
 * propósito: scripts não devem depender de conexão com o banco.
 */
export function assertDemoMode(context: string): void {
  if (quotesMode() !== "demo") {
    throw new Error(
      `${context} requer QUOTES_MODE=demo. Modo atual = ${quotesMode()}. Recusando execução pra não poluir banco real.`,
    );
  }
}
