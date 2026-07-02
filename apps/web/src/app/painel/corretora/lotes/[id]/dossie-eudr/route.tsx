// PDF do Dossiê EUDR do lote (F2). Autenticado (sessão da corretora) — o
// dossiê carrega PII (CPF, CAR, coordenadas) e NÃO tem versão pública; o
// QR do rodapé aponta pra página pública do lote (sem PII). O SHA-256
// impresso amarra o PDF ao export .geojson da rota irmã /eudr.

import { type NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import { eudrGeojsonHash, loadEudrData } from "../../_lib/eudr-export";
import {
  DossieEudrPdf,
  type ChecklistItemPdf,
  type VerificacaoPdf,
} from "../../_lib/dossie-eudr-pdf";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const CHECKLIST_LABEL: Record<string, string> = {
  produtor_cadastrado: "Produtor com cadastro completo",
  cpf_cnpj: "CPF/CNPJ do produtor informado",
  car_numero: "Número do CAR informado",
  car_documento: "Documento do CAR anexado na plataforma",
  talhao_vinculado: "Pelo menos um talhão vinculado ao lote",
  talhoes_georreferenciados: "Todos os talhões vinculados com localização",
  safra: "Safra do lote informada",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    return new NextResponse("nao_autorizado", { status: 401 });
  }
  const { id } = await params;

  const data = await loadEudrData(id, profile.corretora_id);
  if (!data) {
    return new NextResponse("Lote não encontrado.", { status: 404 });
  }
  if (data.featureCollection.features.length === 0) {
    return new NextResponse(
      "O lote ainda não tem talhões georreferenciados — vincule os talhões antes de gerar o dossiê.",
      { status: 409 },
    );
  }

  const supabase = await createClient();
  const { data: checklistRaw } = await supabase.rpc("eudr_checklist", {
    p_lote_id: id,
  });
  const itens = ((checklistRaw as { itens?: { key: string; ok: boolean }[] })
    ?.itens ?? []) as { key: string; ok: boolean }[];
  const checklist: ChecklistItemPdf[] = itens.map((i) => ({
    ...i,
    label: CHECKLIST_LABEL[i.key] ?? i.key,
  }));

  // Última verificação de desmatamento (MapBiomas) de cada talhão.
  const talhaoIds = data.talhoes.map((t) => t.id);
  const { data: verifRows } = await supabase
    .from("talhao_verificacoes")
    .select("talhao_id, status, alertas, verificado_em")
    .in("talhao_id", talhaoIds)
    .order("verificado_em", { ascending: false })
    .limit(talhaoIds.length * 5);
  const ultimaPorTalhao = new Map<
    string,
    { status: string; alertas: unknown; verificado_em: string }
  >();
  for (const v of verifRows ?? []) {
    if (!ultimaPorTalhao.has(v.talhao_id)) ultimaPorTalhao.set(v.talhao_id, v);
  }
  const verificacoes: VerificacaoPdf[] = data.talhoes.map((t) => {
    const v = ultimaPorTalhao.get(t.id);
    const alertas = Array.isArray(v?.alertas)
      ? (v.alertas as Array<{ code?: string }>)
      : [];
    return {
      talhaoNome: t.nome,
      status: v?.status ?? "nao_verificado",
      verificadoEm: v?.verificado_em ?? null,
      alertaCodes: alertas
        .map((a) => a.code)
        .filter((c): c is string => Boolean(c)),
    };
  });

  const publicUrl = `${SITE_URL}/lote/${data.lote.id}`;
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 200,
    color: { dark: "#2D3A2E", light: "#FAF7F0" },
  });

  const emitidoEm = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  const buffer = await renderToBuffer(
    <DossieEudrPdf
      data={data}
      checklist={checklist}
      verificacoes={verificacoes}
      geojsonHash={eudrGeojsonHash(data)}
      qrDataUrl={qrDataUrl}
      publicUrl={publicUrl}
      emitidoEm={emitidoEm}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="dossie-eudr-lote-${data.lote.codigo}.pdf"`,
      // Sem cache: o dossiê reflete o estado ATUAL de talhões/checklist
      // (diferente do laudo, que é imutável após emissão).
      "Cache-Control": "no-store",
    },
  });
}
