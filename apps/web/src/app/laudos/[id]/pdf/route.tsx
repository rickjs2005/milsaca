import { type NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { getLaudoPublico } from "../../_lib/queries";
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
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 200,
    color: { dark: "#2D3A2E", light: "#FAF7F0" },
  });

  const buffer = await renderToBuffer(
    <LaudoPdf laudo={laudo} qrDataUrl={qrDataUrl} publicUrl={publicUrl} />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="laudo-${laudo.lote.codigo}.pdf"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
