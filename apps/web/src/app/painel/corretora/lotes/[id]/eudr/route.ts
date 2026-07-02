// Export GeoJSON dos talhões de origem do lote (EUDR/F2).
// FeatureCollection no formato que o exportador anexa à due diligence
// (DDS/TRACES aceita GeoJSON). Autenticação: sessão da corretora; a RLS
// limita lote/talhões ao que o chamador enxerga.

import { NextResponse } from "next/server";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    return NextResponse.json({ error: "nao_autorizado" }, { status: 401 });
  }
  const { id } = await params;

  const supabase = await createClient();
  const { data: lote } = await supabase
    .from("lotes")
    .select("id, codigo, safra, produtor_id")
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle();
  if (!lote) {
    return NextResponse.json({ error: "lote_nao_encontrado" }, { status: 404 });
  }

  const [{ data: produtor }, { data: vinculos }] = await Promise.all([
    supabase
      .from("produtores")
      .select("car, cpf_cnpj, fazenda_nome, city, state")
      .eq("profile_id", lote.produtor_id)
      .maybeSingle(),
    supabase
      .from("lote_talhoes")
      .select("talhoes(id, nome, area_ha, geojson)")
      .eq("lote_id", id),
  ]);

  type TalhaoLite = {
    id: string;
    nome: string;
    area_ha: number | string | null;
    geojson: unknown | null;
  };

  const features = (vinculos ?? [])
    .map((v) => v.talhoes as unknown as TalhaoLite | null)
    .filter((t): t is TalhaoLite => t != null && t.geojson != null)
    .map((t) => ({
      type: "Feature" as const,
      geometry: t.geojson,
      properties: {
        talhao: t.nome,
        area_ha: t.area_ha != null ? Number(t.area_ha) : null,
        lote: lote.codigo,
        safra: lote.safra,
        car: produtor?.car ?? null,
        produtor_cpf_cnpj: produtor?.cpf_cnpj ?? null,
        fazenda: produtor?.fazenda_nome ?? null,
        municipio: produtor?.city ?? null,
        uf: produtor?.state ?? null,
      },
    }));

  if (features.length === 0) {
    return NextResponse.json(
      { error: "sem_talhoes_georreferenciados" },
      { status: 404 },
    );
  }

  const body = {
    type: "FeatureCollection" as const,
    features,
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/geo+json; charset=utf-8",
      "Content-Disposition": `attachment; filename="lote-${lote.codigo}-eudr.geojson"`,
      "Cache-Control": "no-store",
    },
  });
}
