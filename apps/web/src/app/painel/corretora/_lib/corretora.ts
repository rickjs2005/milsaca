import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import type { Profile } from "@milsaca/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export type SubscriptionInfo = {
  status: "trial" | "active" | "past_due" | "canceled" | "expired" | null;
  effectiveStatus: "trial" | "active" | "past_due" | "canceled" | "expired" | "none";
  /** true se pode usar ações custosas (criar contrato/lote/entrega) */
  isUsable: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  /** dias até expirar (positivo = ainda válida; negativo = já expirou). null se sem data. */
  daysUntilExpiry: number | null;
  planName: string | null;
};

/**
 * Status efetivo da assinatura considerando expiração automática:
 *   - trial com trial_ends_at < now() → expired
 *   - active com current_period_end < now() → past_due
 *
 * Mesma regra da função SQL subscription_effective_status(); replicada
 * em TS pra evitar round-trip extra ao banco.
 */
/**
 * Server-side guard pra ações custosas. Se a assinatura não está
 * utilizável, redireciona pra rota informada com `?error=` amigável.
 * Use em createContrato, createLote, createEntrega — backup do gate
 * de UI pra impedir bypass via POST direto.
 */
export async function requireActiveSubscription(
  corretoraId: string,
  redirectTo: string,
): Promise<void> {
  const info = await getCorretoraSubscriptionInfo(corretoraId);
  if (info.isUsable) return;
  const msg =
    info.effectiveStatus === "canceled"
      ? "Assinatura cancelada. Fale com o suporte."
      : info.effectiveStatus === "expired"
        ? "Trial expirado. Fale com o suporte."
        : info.effectiveStatus === "past_due"
          ? "Pagamento em atraso. Fale com o suporte."
          : "Sem assinatura ativa. Fale com o suporte.";
  redirect(`${redirectTo}?error=${encodeURIComponent(msg)}`);
}

export async function getCorretoraSubscriptionInfo(
  corretoraId: string,
): Promise<SubscriptionInfo> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select(
      "status, trial_ends_at, current_period_end, plans(name)",
    )
    .eq("corretora_id", corretoraId)
    .maybeSingle();

  if (!data) {
    return {
      status: null,
      effectiveStatus: "none",
      isUsable: false,
      trialEndsAt: null,
      currentPeriodEnd: null,
      daysUntilExpiry: null,
      planName: null,
    };
  }

  type Row = {
    status: "trial" | "active" | "past_due" | "canceled" | "expired";
    trial_ends_at: string | null;
    current_period_end: string | null;
    plans: { name: string } | { name: string }[] | null;
  };
  const row = data as unknown as Row;

  const now = Date.now();
  let effective = row.status as SubscriptionInfo["effectiveStatus"];
  if (
    row.status === "trial" &&
    row.trial_ends_at &&
    new Date(row.trial_ends_at).getTime() < now
  ) {
    effective = "expired";
  } else if (
    row.status === "active" &&
    row.current_period_end &&
    new Date(row.current_period_end).getTime() < now
  ) {
    effective = "past_due";
  }

  const ref =
    row.status === "trial" ? row.trial_ends_at : row.current_period_end;
  const daysUntilExpiry = ref
    ? Math.ceil((new Date(ref).getTime() - now) / DAY_MS)
    : null;

  const planName = Array.isArray(row.plans)
    ? row.plans[0]?.name ?? null
    : row.plans?.name ?? null;

  return {
    status: row.status,
    effectiveStatus: effective,
    isUsable: effective === "trial" || effective === "active",
    trialEndsAt: row.trial_ends_at,
    currentPeriodEnd: row.current_period_end,
    daysUntilExpiry,
    planName,
  };
}

export type CorretoraOnboarding = {
  id: string;
  name: string;
  cnpj: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  descricao: string | null;
};

export async function getCorretoraOnboarding(
  corretoraId: string,
): Promise<CorretoraOnboarding | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("corretoras")
    .select("id, name, cnpj, city, state, phone, descricao")
    .eq("id", corretoraId)
    .maybeSingle<CorretoraOnboarding>();
  return data ?? null;
}

/**
 * Corretora "incompleta" pro fluxo de onboarding: precisa de pelo menos
 * CNPJ + cidade/UF + WhatsApp pra aparecer com credibilidade pro produtor.
 * Também checa que o operador (profile) tem nome preenchido.
 */
export function needsCorretoraOnboarding(
  profile: Pick<Profile, "full_name">,
  corretora: CorretoraOnboarding | null,
): boolean {
  if (!corretora) return false; // sem corretora vinculada, /painel/escolher trata
  if (!profile.full_name?.trim()) return true;
  if (!corretora.cnpj?.trim()) return true;
  if (!corretora.city?.trim() || !corretora.state?.trim()) return true;
  if (!corretora.phone?.trim()) return true;
  return false;
}
