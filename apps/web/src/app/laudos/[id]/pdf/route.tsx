import { type NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { getLaudoPublico, laudoContentHash } from "../../_lib/queries";
import { LaudoPdf } from "../../_lib/pdf-template";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type Params = { id: string };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { id } = await params;
  const laudo = await getLaudoPublico(id);
  if (!laudo) {
    return new NextResponse("Laudo não encontrado ou anulado.", {
      status: 404,
    });
  }

  const publicUrl = `${SITE_URL}/laudos/${laudo.id}`;
  const contentHash = laudoContentHash(laudo);
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 200,
    color: { dark: "#2D3A2E", light: "#FAF7F0" },
  });

  const buffer = await renderToBuffer(
    <LaudoPdf
      laudo={laudo}
      qrDataUrl={qrDataUrl}
      publicUrl={publicUrl}
      contentHash={contentHash}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="laudo-${laudo.lote.codigo}.pdf"`,
      // Cache forte (2.5): o laudo é imutável depois de emitido — o
      // get_laudo_publico só retorna laudos não-anulados, e o conteúdo não
      // muda. Render @react-pdf é caro; cachear 1h alivia pico de acesso na
      // serverless. `immutable` evita revalidação. Se o laudo for anulado,
      // a RPC passa a devolver 404 (sem cache no caminho de erro).
      "Cache-Control": "public, max-age=3600, immutable",
    },
  });
}
