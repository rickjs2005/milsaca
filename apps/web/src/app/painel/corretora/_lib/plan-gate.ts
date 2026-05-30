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

/**
 * Tem o plano pago (Premium) OU é fundadora → libera tudo.
 *
 * Como agora só existe UM plano pago, "pro ou acima" e "premium" significam
 * a mesma coisa: qualquer tier que não seja o gratuito. O nome é mantido
 * pra não quebrar os call-sites (analytics, contratos, entregas, dashboard).
 */
export function isProOrAbove(
  subscription: SubscriptionInfo | null,
): boolean {
  return getCorretoraTier(subscription) === "premium";
}

/**
 * Plano pago (Premium) ou fundadora libera features de equipe / API.
 * Idêntico a `isProOrAbove` agora que só há um plano pago — mantido pra
 * compat de imports e clareza semântica nos call-sites.
 */
export function isPremium(
  subscription: SubscriptionInfo | null,
): boolean {
  return getCorretoraTier(subscription) === "premium";
}

/**
 * Features do plano pago marcadas pra UI. Esse mapa é a fonte de verdade
 * que documenta QUAIS features ficam atrás do gate de assinatura —
 * mantém consistência com o catálogo de planos.
 */
export const PRO_FEATURES = {
  analytics: "Analytics comercial",
  automacao: "Automação comercial",
  contratos: "Contratos e comissão",
  entregas: "Gestão de entregas",
} as const;

export type ProFeatureKey = keyof typeof PRO_FEATURES;
