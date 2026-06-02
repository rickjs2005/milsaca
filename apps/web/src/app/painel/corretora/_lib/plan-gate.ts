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

/**
 * Tier efetivo da corretora baseado na subscription.
 *
 * É o tier de **exibição** (rótulo do plano): uma corretora com Premium
 * vencido continua sendo "premium" aqui — pra ela ver na tela de Assinatura
 * que o plano dela é Premium + CTA de renovar. NÃO use isso pra decidir se
 * a corretora "pode usar agora" features pagas; pra isso use `isProOrAbove`/
 * `isPremium`, que também checam se a assinatura está utilizável.
 */
function getCorretoraTier(
  subscription: SubscriptionInfo | null,
): PlanTier {
  if (!subscription) return "gratuito";
  return detectCurrentTier(
    subscription.planName,
    subscription.effectiveStatus,
  );
}

/**
 * Pode USAR AGORA as features do plano pago (Premium) OU é fundadora.
 *
 * Dois requisitos, ambos necessários:
 *  1. tier pago ("premium") — descarta quem é Gratuito; e
 *  2. assinatura UTILIZÁVEL (`isUsable` = effectiveStatus trial|active) —
 *     descarta Premium expirado/past_due/canceled.
 *
 * Esse alinhamento com o gate do backend (`requireActiveSubscription` →
 * `isUsable`) é o conserto do bug I5: antes a UI mostrava o CTA "Novo" pra
 * Premium vencido (tier sozinho), mas o POST era rejeitado pelo server.
 * Agora o CTA só aparece quando o backend também aceitaria a criação.
 *
 * Como agora só existe UM plano pago, "pro ou acima" e "premium" significam
 * a mesma coisa: qualquer tier que não seja o gratuito. O nome é mantido
 * pra não quebrar os call-sites (analytics, contratos, entregas, dashboard).
 */
export function isProOrAbove(
  subscription: SubscriptionInfo | null,
): boolean {
  if (!subscription?.isUsable) return false;
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
