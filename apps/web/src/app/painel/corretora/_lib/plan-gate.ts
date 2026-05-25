/**
 * Helpers de gate por plano da corretora.
 *
 * Estratégia da Fase 9e: bloqueio **visual** + nudge, não barrar server.
 * O `requireActiveSubscription` continua sendo o gate real pra ações
 * custosas (cria contrato/lote/entrega). Aqui só decidimos se mostramos
 * `<LockedHint>` em telas Pro-only quando a corretora está no Gratuito.
 *
 * Reusa `detectCurrentTier` da Fase 8 — fonte única do tier atual.
 */

import { detectCurrentTier, type PlanTier } from "../assinatura/_lib/plans-catalog";
import type { SubscriptionInfo } from "./corretora";

/** Tier efetivo da corretora baseado na subscription. */
export function getCorretoraTier(
  subscription: SubscriptionInfo | null,
): PlanTier {
  if (!subscription) return "gratuito";
  return detectCurrentTier(
    subscription.planName,
    subscription.effectiveStatus,
  );
}

/** Pro/Premium liberam features comerciais avançadas. */
export function isProOrAbove(
  subscription: SubscriptionInfo | null,
): boolean {
  const tier = getCorretoraTier(subscription);
  return tier === "pro" || tier === "premium";
}

/** Premium libera features de equipe / API. */
export function isPremium(
  subscription: SubscriptionInfo | null,
): boolean {
  return getCorretoraTier(subscription) === "premium";
}

/**
 * Features Pro-only marcadas pra UI. Esse mapa é a fonte de verdade
 * que documenta QUAL feature está em qual plano — mantém consistência
 * com o catálogo da Fase 8.
 */
export const PRO_FEATURES = {
  analytics: "Analytics comercial",
  automacao: "Automação comercial",
  contratos: "Contratos e comissão",
  entregas: "Gestão de entregas",
} as const;

export type ProFeatureKey = keyof typeof PRO_FEATURES;
