import { createClient } from "@milsaca/db/web/server";
import type { Profile } from "@milsaca/types";

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
