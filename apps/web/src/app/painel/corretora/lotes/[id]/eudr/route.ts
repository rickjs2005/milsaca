// Export GeoJSON dos talhões de origem do lote (EUDR/F2).
// FeatureCollection no formato que o exportador anexa à due diligence
// (DDS/TRACES aceita GeoJSON). O SHA-256 deste arquivo é impresso no PDF
// do dossiê (rota irmã /dossie-eudr) — mesma serialização, mesmo hash.
// Autenticação: sessão da corretora; a RLS limita o que o chamador enxerga.

import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { loadEudrData } from "../../_lib/eudr-export";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    return NextResponse.json({ error: "nao_autorizado" }, { status: 401 });
  }
  const { id } = await params;

  const data = await loadEudrData(id, profile.corretora_id);
  if (!data) {
    return NextResponse.json({ error: "lote_nao_encontrado" }, { status: 404 });
  }
  if (data.featureCollection.features.length === 0) {
    return NextResponse.json(
      { error: "sem_talhoes_georreferenciados" },
      { status: 404 },
    );
  }

  return new NextResponse(JSON.stringify(data.featureCollection, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/geo+json; charset=utf-8",
      "Content-Disposition": `attachment; filename="lote-${data.lote.codigo}-eudr.geojson"`,
      "Cache-Control": "no-store",
    },
  });
}
