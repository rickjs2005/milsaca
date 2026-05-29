import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ShieldCheck, MapPin, FileCheck2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getContratoPublico } from "../../_lib/queries";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  em_analise: "Em análise",
  ativo: "Ativo (assinado)",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const contrato = await getContratoPublico(id);
  if (!contrato) return { title: "Contrato não encontrado · Milsaca" };
  return {
    title: `Verificação do contrato ${contrato.code} · Milsaca`,
    description: `Verificação pública do contrato ${contrato.code} emitido via Milsaca.`,
  };
}

function Parte({
  titulo,
  nome,
  doc,
  city,
  state,
}: {
  titulo: string;
  nome: string;
  doc: string | null;
  city: string | null;
  state: string | null;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-milsaca-verde-claro">
        {titulo}
      </p>
      <p className="font-medium text-milsaca-verde">{nome}</p>
      {doc && (
        <p className="font-mono text-xs text-milsaca-verde-claro">{doc}</p>
      )}
      {(city || state) && (
        <p className="text-xs text-milsaca-verde-claro">
          {[city, state].filter(Boolean).join(" / ")}
        </p>
      )}
    </div>
  );
}

export default async function VerificarContratoPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const contrato = await getContratoPublico(id);
  if (!contrato) notFound();

  const publicUrl = `${SITE_URL}/contratos/${contrato.id}/verificar`;
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
    color: { dark: "#2D3A2E", light: "#FAF7F0" },
  });

  return (
    <div className="min-h-screen bg-milsaca-cream py-8">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-milsaca-verde pb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
              {contrato.corretora.name}
            </h1>
            <p className="mt-1 text-sm text-milsaca-verde-claro">
              {[contrato.corretora.city, contrato.corretora.state]
                .filter(Boolean)
                .join(" / ")}
            </p>
            <Badge className="mt-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              <ShieldCheck className="mr-1 h-3 w-3" />
              Documento emitido via Milsaca
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-milsaca-verde-claro">
              Verificação de contrato
            </p>
            <p className="text-sm font-medium text-milsaca-verde">
              Nº {contrato.code}
            </p>
            <p className="text-xs text-milsaca-verde-claro">
              Assinado em {formatDate(contrato.signed_at)}
            </p>
          </div>
        </header>

        {/* Situação */}
        <Card className="border-2 border-milsaca-verde bg-milsaca-cream-escuro/30">
          <CardContent className="space-y-2 py-6">
            <p className="text-xs uppercase tracking-wider text-milsaca-verde-claro">
              Situação
            </p>
            <div className="flex items-center gap-2">
              {contrato.status === "ativo" ||
              contrato.status === "finalizado" ? (
                <CheckCircle2 className="h-6 w-6 text-milsaca-verde" />
              ) : (
                <FileCheck2 className="h-6 w-6 text-milsaca-verde-claro" />
              )}
              <span className="text-2xl font-semibold text-milsaca-verde">
                {STATUS_LABEL[contrato.status] ?? contrato.status}
              </span>
            </div>
            <p className="text-xs text-milsaca-verde-claro">
              Esta página confirma a existência e a integridade do documento
              gerado pela Milsaca. Por privacidade (LGPD), nomes e documentos
              aparecem parcialmente mascarados e valores não são exibidos.
            </p>
          </CardContent>
        </Card>

        {/* Partes */}
        <Card className="border-milsaca-cream-escuro">
          <CardContent className="grid grid-cols-1 gap-4 py-5 sm:grid-cols-2">
            <Parte
              titulo="Produtor (vendedor)"
              nome={contrato.produtor.nome}
              doc={contrato.produtor.doc}
              city={contrato.produtor.city}
              state={contrato.produtor.state}
            />
            {contrato.comprador ? (
              <Parte
                titulo="Comprador"
                nome={contrato.comprador.nome}
                doc={contrato.comprador.doc}
                city={contrato.comprador.city}
                state={contrato.comprador.state}
              />
            ) : (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-milsaca-verde-claro">
                  Comprador
                </p>
                <p className="font-medium text-milsaca-verde">— a definir —</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hash + QR */}
        <Card className="border-milsaca-cream-escuro">
          <CardContent className="space-y-4 py-5">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-milsaca-verde-claro">
                Hash SHA-256 do documento
              </p>
              {contrato.content_hash ? (
                <p className="mt-1 break-all font-mono text-xs text-milsaca-verde">
                  {contrato.content_hash}
                </p>
              ) : (
                <p className="mt-1 text-xs text-milsaca-verde-claro">
                  Ainda não assinado — o hash é congelado quando o contrato é
                  assinado.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-milsaca-cream-escuro pt-4">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL, sem ganho com next/image */}
                <img
                  src={qrDataUrl}
                  alt="QR code para verificação"
                  className="h-24 w-24"
                />
                <div className="text-xs text-milsaca-verde-claro">
                  <p className="font-medium text-milsaca-verde">
                    Verifique este contrato
                  </p>
                  <p>Escaneie o QR ou acesse o link abaixo.</p>
                  <p className="mt-1 break-all font-mono text-[11px]">
                    {publicUrl}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <footer className="pt-4 text-center text-xs text-milsaca-verde-claro">
          <p className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Documento emitido via Milsaca — milsaca.app
          </p>
        </footer>
      </div>
    </div>
  );
}
