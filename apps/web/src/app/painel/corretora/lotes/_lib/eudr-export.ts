// Builder compartilhado do dado EUDR do lote (F2): o export .geojson e o
// PDF do dossiê consomem EXATAMENTE a mesma estrutura — o PDF imprime o
// SHA-256 do FeatureCollection, amarrando o documento humano ao arquivo de
// máquina que o exportador anexa à DDS.

import { createHash } from "node:crypto";
import { createClient } from "@milsaca/db/web/server";

export type EudrTalhao = {
  id: string;
  nome: string;
  area_ha: number | null;
  geojson: unknown | null;
  origem: string;
};

export type EudrData = {
  lote: {
    id: string;
    codigo: string;
    safra: string | null;
    specie: string;
    peso_sacas: number | null;
    produtor_id: string;
  };
  produtorNome: string | null;
  produtor: {
    car: string | null;
    cpf_cnpj: string | null;
    fazenda_nome: string | null;
    city: string | null;
    state: string | null;
  } | null;
  corretoraNome: string;
  talhoes: EudrTalhao[];
  featureCollection: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      geometry: unknown;
      properties: Record<string, unknown>;
    }>;
  };
};

/**
 * Carrega lote + produtor + talhões vinculados e monta o FeatureCollection
 * (só talhões COM geometria viram features). Retorna null se o lote não
 * pertence à corretora do chamador. RLS cobre o resto.
 */
export async function loadEudrData(
  loteId: string,
  corretoraId: string,
): Promise<EudrData | null> {
  const supabase = await createClient();

  const { data: lote } = await supabase
    .from("lotes")
    .select(
      `id, codigo, safra, specie, peso_sacas, produtor_id,
       produtor:profiles!lotes_produtor_id_fkey(full_name),
       corretora:corretoras!lotes_corretora_id_fkey(name)`,
    )
    .eq("id", loteId)
    .eq("corretora_id", corretoraId)
    .maybeSingle();
  if (!lote) return null;

  const [{ data: produtor }, { data: vinculos }] = await Promise.all([
    supabase
      .from("produtores")
      .select("car, cpf_cnpj, fazenda_nome, city, state")
      .eq("profile_id", lote.produtor_id)
      .maybeSingle(),
    supabase
      .from("lote_talhoes")
      .select("talhoes(id, nome, area_ha, geojson, origem)")
      .eq("lote_id", loteId),
  ]);

  type Raw = {
    id: string;
    nome: string;
    area_ha: number | string | null;
    geojson: unknown | null;
    origem: string;
  };

  const talhoes: EudrTalhao[] = (vinculos ?? [])
    .map((v) => v.talhoes as unknown as Raw | null)
    .filter((t): t is Raw => t != null)
    .map((t) => ({
      ...t,
      area_ha: t.area_ha != null ? Number(t.area_ha) : null,
    }));

  const features = talhoes
    .filter((t) => t.geojson != null)
    .map((t) => ({
      type: "Feature" as const,
      geometry: t.geojson,
      properties: {
        talhao: t.nome,
        area_ha: t.area_ha,
        lote: lote.codigo,
        safra: lote.safra,
        car: produtor?.car ?? null,
        produtor_cpf_cnpj: produtor?.cpf_cnpj ?? null,
        fazenda: produtor?.fazenda_nome ?? null,
        municipio: produtor?.city ?? null,
        uf: produtor?.state ?? null,
      },
    }));

  const produtorJoin = lote.produtor as { full_name: string | null } | null;
  const corretoraJoin = lote.corretora as { name: string } | null;

  return {
    lote: {
      id: lote.id,
      codigo: lote.codigo,
      safra: lote.safra,
      specie: lote.specie,
      peso_sacas: lote.peso_sacas != null ? Number(lote.peso_sacas) : null,
      produtor_id: lote.produtor_id,
    },
    produtorNome: produtorJoin?.full_name ?? null,
    produtor: produtor ?? null,
    corretoraNome: corretoraJoin?.name ?? "",
    talhoes,
    featureCollection: { type: "FeatureCollection", features },
  };
}

/** SHA-256 do FeatureCollection serializado (o mesmo JSON do download). */
export function eudrGeojsonHash(data: EudrData): string {
  return createHash("sha256")
    .update(JSON.stringify(data.featureCollection, null, 2))
    .digest("hex");
}
