// Library compartilhada dos painéis do produtor.
// Centraliza queries de leitura da própria fazenda + helpers de status.

import { cache } from "react";
import { createClient } from "@milsaca/db/web/server";
import type { Database } from "@milsaca/types/database";

export type ProdutorSpecie = Database["public"]["Enums"]["produtor_specie"];
type ProdutorStatus = Database["public"]["Enums"]["produtor_status"];
export type CanalPreferido = Database["public"]["Enums"]["canal_preferido"];

export const SPECIE_LABEL: Record<ProdutorSpecie, string> = {
  arabica: "Arábica",
  conilon: "Conilón",
  ambos: "Ambos",
};

export const CANAL_LABEL: Record<CanalPreferido, string> = {
  app: "Pelo app",
  whatsapp: "WhatsApp",
  email: "E-mail",
  sms: "SMS",
};

// Tipo carrega tudo que a UI precisa do perfil estendido do produtor.
export type ProdutorRow = {
  id: string;
  profile_id: string;
  fazenda_nome: string | null;
  city: string | null;
  state: string | null;
  area_ha: number | null;
  altitude_m: number | null;
  cpf_cnpj: string | null;
  caepf: string | null;
  whatsapp: string | null;
  status: ProdutorStatus;
  specie: ProdutorSpecie | null;
  variedades: string[];
  certificacoes: string[];
  indicacao_geografica: string | null;
  polygon_geojson: unknown | null;
  foto_capa_url: string | null;
  car: string | null;
  preco_alvo: number | null;
  canal_preferido: CanalPreferido | null;
  receber_cotacao_diaria: boolean;
};

type Raw = Omit<
  ProdutorRow,
  "area_ha" | "altitude_m" | "preco_alvo" | "variedades" | "certificacoes"
> & {
  area_ha: number | string | null;
  altitude_m: number | string | null;
  preco_alvo: number | string | null;
  variedades: unknown;
  certificacoes: unknown;
};

function toStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function num(v: number | string | null): number | null {
  return v == null ? null : Number(v);
}

function toRow(r: Raw): ProdutorRow {
  return {
    ...r,
    area_ha: num(r.area_ha),
    altitude_m: num(r.altitude_m),
    preco_alvo: num(r.preco_alvo),
    variedades: toStrArray(r.variedades),
    certificacoes: toStrArray(r.certificacoes),
  };
}

// React.cache: layout + página re-buscavam o produtor no mesmo request.
export const getProdutorByProfileId = cache(async (
  profileId: string,
): Promise<ProdutorRow | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("produtores")
    .select(
      `id, profile_id, fazenda_nome, city, state, area_ha, altitude_m,
       cpf_cnpj, caepf, whatsapp, status, specie, variedades, certificacoes,
       indicacao_geografica, polygon_geojson, foto_capa_url, car,
       preco_alvo, canal_preferido, receber_cotacao_diaria`,
    )
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!data) return null;
  return toRow(data as Raw);
});

/**
 * Determina se o produtor passou pelo onboarding mínimo.
 * MVP enxuto (2026-06): basta nome + WhatsApp (contato) + registro de
 * produtor. CPF, fazenda, UF/cidade e espécie são opcionais e podem ser
 * completados depois no Perfil — reduz fricção no primeiro acesso.
 */
export function needsOnboarding(
  profile: { full_name: string | null },
  produtor: ProdutorRow | null,
): boolean {
  if (!profile.full_name?.trim()) return true;
  if (!produtor) return true;
  if (!produtor.whatsapp?.trim()) return true;
  return false;
}

