/**
 * Catálogo de planos exibido pra corretora.
 *
 * Estratégia:
 *  1. Tenta carregar planos ativos do banco (`select * from plans where active`).
 *  2. Se houver registros: mescla com o catálogo hardcoded por `slug`,
 *     usando preço/nome/descrição do banco como source of truth e features
 *     do hardcoded (porque features são pega do app, não do banco).
 *  3. Se vazio: usa o catálogo hardcoded.
 *
 * Pagamento ainda não é processado pelo sistema; CTA principal é "Falar
 * no WhatsApp" pra a Milsaca ativar manualmente. Quando integrar
 * Stripe/Asaas, basta trocar o CTA pra checkout.
 */

import { createClient } from "@milsaca/db/web/server";

export type PlanTier = "gratuito" | "premium";

export type PlanFeature = {
  /** Texto curto da funcionalidade. */
  label: string;
  /** Se aparece como ✓ (incluído) ou — (não incluído nesse tier). */
  included: boolean;
};

export type PlanCatalogItem = {
  tier: PlanTier;
  /** Slug pra match com `plans.slug` se o admin criar registro com mesmo nome. */
  slug: string;
  name: string;
  /** Bullet curto que aparece embaixo do nome. */
  tagline: string;
  /** Preço mensal em BRL — apresentação só. */
  priceLabel: string;
  /** Bullet do preço (por mês / por ano / sob consulta). */
  pricePeriod: string;
  /** Highlight visual: usado em "Mais escolhido" / "Recomendado". */
  highlight: "current" | "recommended" | "enterprise" | null;
  /** Texto do CTA principal. */
  ctaLabel: string;
  features: PlanFeature[];
};

const FEATURES = {
  perfilPublico: "Perfil público (/c/<slug>)",
  cob: "Classificação COB ilimitada",
  whatsappLink: "Templates de WhatsApp pra leads e lotes",
  cotacoes: "Cotações manuais da praça",
  leadsLimitados: "Até 30 leads ativos",
  leadsIlimitados: "Leads ilimitados",
  lotesLimitados: "Até 10 lotes ativos",
  lotesIlimitados: "Lotes ilimitados",
  contratos: "Contratos + entregas + comissão",
  analytics: "Analytics comercial (conversão, mix, top compradores)",
  automacao: "Automação comercial (sugestões de follow-up)",
  multiOperador: "Múltiplos operadores na corretora",
  relatoriosAvancados: "Relatórios PDF + export CSV",
  prioridadeSuporte: "Suporte prioritário no WhatsApp",
  apiPublica: "API pública pra integração",
};

export const PLANS: PlanCatalogItem[] = [
  {
    tier: "gratuito",
    slug: "gratuito",
    name: "Gratuito",
    tagline: "Pra começar e testar o sistema",
    priceLabel: "R$ 0",
    pricePeriod: "pra sempre",
    highlight: null,
    ctaLabel: "Plano atual",
    features: [
      { label: FEATURES.perfilPublico, included: true },
      { label: FEATURES.cob, included: true },
      { label: FEATURES.whatsappLink, included: true },
      { label: FEATURES.cotacoes, included: true },
      { label: FEATURES.leadsLimitados, included: true },
      { label: FEATURES.lotesLimitados, included: true },
      { label: FEATURES.contratos, included: false },
      { label: FEATURES.analytics, included: false },
      { label: FEATURES.automacao, included: false },
      { label: FEATURES.multiOperador, included: false },
      { label: FEATURES.relatoriosAvancados, included: false },
      { label: FEATURES.prioridadeSuporte, included: false },
      { label: FEATURES.apiPublica, included: false },
    ],
  },
  {
    tier: "premium",
    slug: "corretora-premium",
    name: "Premium",
    tagline: "Painel completo · 1º mês grátis",
    priceLabel: "R$ 100",
    pricePeriod: "por mês",
    highlight: "recommended",
    ctaLabel: "Quero o Premium",
    features: [
      { label: FEATURES.perfilPublico, included: true },
      { label: FEATURES.cob, included: true },
      { label: FEATURES.whatsappLink, included: true },
      { label: FEATURES.cotacoes, included: true },
      { label: FEATURES.leadsIlimitados, included: true },
      { label: FEATURES.lotesIlimitados, included: true },
      { label: FEATURES.contratos, included: true },
      { label: FEATURES.analytics, included: true },
      { label: FEATURES.automacao, included: true },
      { label: FEATURES.multiOperador, included: true },
      { label: FEATURES.relatoriosAvancados, included: true },
      { label: FEATURES.prioridadeSuporte, included: true },
      { label: FEATURES.apiPublica, included: true },
    ],
  },
];

/**
 * Heurística: identifica qual plano do catálogo é o atual da corretora,
 * baseado no `planName` que vem de subscriptions.plans(name). Match por
 * substring case-insensitive — tolera variações de capitalização do admin.
 *
 * Retorna `gratuito` quando não há subscription ou plano não bate com
 * nenhum tier pago. Considera trial/active como "premium" pra incentivar
 * o usuário a manter os benefícios depois do trial.
 *
 * Como agora só existe UM plano pago ("Premium"), qualquer plano que não
 * seja o gratuito é tratado como "premium". Isso inclui o programa de
 * fundadoras (plano "Fundadora", grátis vitalício), que tem acesso
 * completo e portanto deve ser detectado como pago/premium.
 */
export function detectCurrentTier(
  planName: string | null,
  effectiveStatus: string,
): PlanTier {
  if (effectiveStatus === "none") return "gratuito";
  if (!planName) {
    // Tem subscription (trial/active) mas sem plano nomeado — assume pago
    return effectiveStatus === "trial" || effectiveStatus === "active"
      ? "premium"
      : "gratuito";
  }
  const lower = planName.toLowerCase();
  // "Gratuito" é o único plano não-pago. Premium, Pro (legado), Fundadora
  // e qualquer outro plano nomeado liberam o painel completo → "premium".
  if (lower.includes("gratuito") || lower.includes("grátis")) return "gratuito";
  return "premium";
}

/**
 * Carrega planos do banco e mescla com o catálogo hardcoded.
 *
 * Match por `slug`: se admin criar um `plans` com slug "corretora-premium",
 * o nome / preço / descrição vêm do banco e as features (que dependem do
 * que o app entrega) ficam do hardcoded. Planos no banco com slug
 * desconhecido (ex: "corretora-fundador") não aparecem no grid — só os
 * slugs do catálogo hardcoded são renderizados.
 *
 * Se o select falha ou volta vazio, devolve o catálogo hardcoded — UI
 * nunca fica vazia. RLS já gateia (`plans_select` permite authenticated
 * lerem ativos), então mesmo sem `is_admin()` o corretor vê o catálogo.
 */
type PlanRow = {
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  billing_period: "monthly" | "yearly";
};

function priceLabelFromCents(cents: number, period: "monthly" | "yearly"): {
  priceLabel: string;
  pricePeriod: string;
} {
  if (cents === 0) {
    return { priceLabel: "R$ 0", pricePeriod: "pra sempre" };
  }
  const brl = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
  return {
    priceLabel: brl.format(cents / 100),
    pricePeriod: period === "yearly" ? "por ano" : "por mês",
  };
}

export async function loadPlans(): Promise<PlanCatalogItem[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("plans")
      .select("slug, name, description, price_cents, billing_period")
      .eq("active", true)
      .order("price_cents", { ascending: true });

    if (error || !data || data.length === 0) {
      return PLANS;
    }

    const rows = data as PlanRow[];
    return PLANS.map((hardcoded) => {
      const fromDb = rows.find((r) => r.slug === hardcoded.slug);
      if (!fromDb) return hardcoded;
      const price = priceLabelFromCents(fromDb.price_cents, fromDb.billing_period);
      return {
        ...hardcoded,
        name: fromDb.name,
        tagline: fromDb.description ?? hardcoded.tagline,
        priceLabel: price.priceLabel,
        pricePeriod: price.pricePeriod,
      };
    });
  } catch {
    // Defesa contra qualquer erro inesperado — devolve catálogo hardcoded
    return PLANS;
  }
}

const WHATSAPP_NUMBER = "5533999999999";

/**
 * Texto pré-preenchido pra wa.me, contextualizando o pedido com base
 * no plano que a corretora quer ativar.
 */
export function whatsappLinkForUpgrade(
  tier: PlanTier,
  corretoraName: string | null,
): string {
  const planos: Record<PlanTier, string> = {
    gratuito: "manter no plano Gratuito",
    premium: "ativar o plano Premium (R$100/mês, 1º mês grátis)",
  };
  const corretora = corretoraName ? ` (${corretoraName})` : "";
  const text = `Olá! Quero ${planos[tier]} no Milsaca${corretora}. Me passa os próximos passos?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
