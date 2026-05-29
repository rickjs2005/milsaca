import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import {
  ShieldCheck,
  Download,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Mail,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLaudoPublico, laudoContentHash } from "../_lib/queries";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const SPECIE_LABEL: Record<string, string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};
const PROCESSO_LABEL: Record<string, string> = {
  natural: "Natural",
  cereja_descascado: "Cereja descascado",
  cd_desmucilado: "CD desmucilado",
  despolpado: "Despolpado",
  fermentacao_induzida: "Fermentação induzida",
};
const DEFEITO_LABEL: Record<string, string> = {
  pretos: "Pretos",
  verdes: "Verdes",
  ardidos: "Ardidos",
  brocados: "Brocados",
  conchas: "Conchas",
  quebrados: "Quebrados",
  cocos: "Cocos",
  marinheiros: "Marinheiros",
  paus_pequenos: "Paus pequenos",
  paus_medios: "Paus médios",
  paus_grandes: "Paus grandes",
  pedras_pequenas: "Pedras pequenas",
  pedras_medias: "Pedras médias",
  pedras_grandes: "Pedras grandes",
  cascas_grandes: "Cascas grandes",
  cascas_pequenas: "Cascas pequenas",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const laudo = await getLaudoPublico(id);
  if (!laudo) return { title: "Laudo não encontrado · Milsaca" };
  return {
    title: `Laudo COB ${laudo.lote.codigo} · ${laudo.corretora.name}`,
    description: `Laudo de classificação IN 8/2003 emitido por ${laudo.corretora.name} para o lote ${laudo.lote.codigo}.`,
  };
}

export default async function LaudoPublicoPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const laudo = await getLaudoPublico(id);
  if (!laudo) notFound();

  const publicUrl = `${SITE_URL}/laudos/${laudo.id}`;
  const contentHash = laudoContentHash(laudo);
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
    color: { dark: "#2D3A2E", light: "#FAF7F0" },
  });

  const defeitos = laudo.defeitos_crus
    ? Object.entries(laudo.defeitos_crus)
        .filter(([, v]) => typeof v === "number" && v > 0)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
    : [];

  const peneiras = (laudo.peneiras ?? [])
    .filter((p) => p.percentual > 0)
    .sort((a, b) => b.percentual - a.percentual);

  return (
    <div className="min-h-screen bg-milsaca-cream py-8">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        {/* Header com identidade da corretora */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-milsaca-verde pb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
              {laudo.corretora.name}
            </h1>
            <p className="mt-1 text-sm text-milsaca-verde-claro">
              {[laudo.corretora.city, laudo.corretora.state]
                .filter(Boolean)
                .join(" / ")}
              {laudo.corretora.email && (
                <>
                  <span className="mx-1">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {laudo.corretora.email}
                  </span>
                </>
              )}
            </p>
            {laudo.corretora.verified && (
              <Badge className="mt-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                <ShieldCheck className="mr-1 h-3 w-3" />
                Verificada na Milsaca
              </Badge>
            )}
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs uppercase tracking-wider text-milsaca-verde-claro">
              Laudo COB
            </p>
            <p className="text-sm font-medium text-milsaca-verde">
              IN 8/2003 — MAPA
            </p>
            <p className="text-xs text-milsaca-verde-claro">
              Emitido em {formatDate(laudo.created_at)}
            </p>
          </div>
        </header>

        {/* Resultado destacado */}
        <Card
          className={
            laudo.fora_de_tipo
              ? "border-2 border-rose-300 bg-rose-50"
              : "border-2 border-milsaca-verde bg-milsaca-cream-escuro/30"
          }
        >
          <CardContent className="space-y-3 py-6">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-milsaca-verde-claro">
                  Resultado
                </p>
                {laudo.fora_de_tipo ? (
                  <div className="mt-1 flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6 text-rose-700" />
                    <span className="text-2xl sm:text-3xl font-semibold text-rose-700">
                      Fora de tipo
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-milsaca-verde" />
                    <span className="text-2xl sm:text-3xl font-semibold text-milsaca-verde">
                      {laudo.bica_corrida
                        ? "Bica corrida"
                        : `Tipo ${laudo.tipo ?? "—"}`}
                      {laudo.classe && (
                        <span className="ml-2 text-base font-normal text-milsaca-verde-claro">
                          · {laudo.classe}
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
              <Button
                asChild
                className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
              >
                <Link href={`/laudos/${laudo.id}/pdf`} target="_blank">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar PDF
                </Link>
              </Button>
            </div>
            {laudo.fora_de_tipo &&
              laudo.fora_de_tipo_motivos &&
              laudo.fora_de_tipo_motivos.length > 0 && (
                <p className="text-sm text-rose-800">
                  <span className="font-medium">Motivos:</span>{" "}
                  {laudo.fora_de_tipo_motivos.join(" · ")}
                </p>
              )}
          </CardContent>
        </Card>

        {/* Dados do lote */}
        <Card className="border-milsaca-cream-escuro">
          <CardContent className="py-5">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-milsaca-verde-claro">
              Lote
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Código" value={laudo.lote.codigo} />
              <Field
                label="Espécie"
                value={SPECIE_LABEL[laudo.lote.specie] ?? laudo.lote.specie}
              />
              <Field
                label="Processo"
                value={
                  laudo.lote.processo
                    ? (PROCESSO_LABEL[laudo.lote.processo] ?? laudo.lote.processo)
                    : "—"
                }
              />
              <Field label="Safra" value={laudo.lote.safra ?? "—"} />
              <Field
                label="Peso (sacas 60kg)"
                value={
                  laudo.lote.peso_sacas != null
                    ? laudo.lote.peso_sacas.toLocaleString("pt-BR")
                    : "—"
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Indicadores */}
        <Card className="border-milsaca-cream-escuro">
          <CardContent className="py-5">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-milsaca-verde-claro">
              Indicadores
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <Field
                label="Total de defeitos"
                value={`${laudo.total_defeitos} em 300g`}
              />
              <Field
                label="Pontuação"
                value={laudo.pontuacao != null ? String(laudo.pontuacao) : "—"}
              />
              <Field label="Bebida" value={laudo.bebida ?? "—"} />
              <Field label="Aspecto" value={laudo.aspecto ?? "—"} />
              <Field label="Torra" value={laudo.torra ?? "—"} />
              <Field
                label="Umidade (%)"
                value={
                  laudo.umidade != null
                    ? laudo.umidade.toLocaleString("pt-BR", {
                        minimumFractionDigits: 1,
                      })
                    : "—"
                }
              />
              <Field
                label="Impurezas (%)"
                value={
                  laudo.impurezas_pct != null
                    ? laudo.impurezas_pct.toLocaleString("pt-BR", {
                        minimumFractionDigits: 1,
                      })
                    : "—"
                }
              />
              <Field
                label="PVA (%)"
                value={
                  laudo.pva != null
                    ? laudo.pva.toLocaleString("pt-BR", {
                        minimumFractionDigits: 1,
                      })
                    : "—"
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Defeitos contados */}
        {defeitos.length > 0 && (
          <Card className="border-milsaca-cream-escuro">
            <CardContent className="py-5">
              <h2 className="mb-1 text-xs font-medium uppercase tracking-wider text-milsaca-verde-claro">
                Defeitos contados
              </h2>
              <p className="mb-3 text-xs text-milsaca-verde-claro">
                {laudo.brocados_por_defeito} brocados por defeito
              </p>
              <div className="overflow-hidden rounded-md border border-milsaca-cream-escuro">
                <table className="w-full text-sm">
                  <thead className="bg-milsaca-cream-escuro/40 text-xs uppercase tracking-wider text-milsaca-verde-claro">
                    <tr>
                      <th className="px-4 py-2 text-left">Defeito</th>
                      <th className="px-4 py-2 text-right">Grãos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-milsaca-cream-escuro">
                    {defeitos.map(([k, v]) => (
                      <tr key={k}>
                        <td className="px-4 py-2 text-milsaca-verde">
                          {DEFEITO_LABEL[k] ?? k}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-milsaca-verde">
                          {String(v)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Peneiras */}
        {peneiras.length > 0 && (
          <Card className="border-milsaca-cream-escuro">
            <CardContent className="py-5">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-milsaca-verde-claro">
                Peneiras
                {laudo.peneira_dominante && (
                  <span className="ml-2 text-milsaca-verde">
                    Dominante: {laudo.peneira_dominante}
                  </span>
                )}
              </h2>
              <div className="overflow-hidden rounded-md border border-milsaca-cream-escuro">
                <table className="w-full text-sm">
                  <thead className="bg-milsaca-cream-escuro/40 text-xs uppercase tracking-wider text-milsaca-verde-claro">
                    <tr>
                      <th className="px-4 py-2 text-left">Peneira</th>
                      <th className="px-4 py-2 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-milsaca-cream-escuro">
                    {peneiras.map((p) => (
                      <tr key={p.peneira}>
                        <td className="px-4 py-2 text-milsaca-verde">
                          {p.peneira}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-milsaca-verde">
                          {p.percentual.toLocaleString("pt-BR", {
                            minimumFractionDigits: 1,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Observações */}
        {laudo.observacoes && (
          <Card className="border-milsaca-cream-escuro">
            <CardContent className="py-5">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-milsaca-verde-claro">
                Observações
              </h2>
              <p className="text-sm leading-relaxed text-milsaca-verde">
                {laudo.observacoes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* QR + identificador */}
        <Card className="border-milsaca-cream-escuro">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL, sem ganho com next/image */}
              <img
                src={qrDataUrl}
                alt="QR code para verificação"
                className="h-24 w-24"
              />
              <div className="text-xs text-milsaca-verde-claro">
                <p className="font-medium text-milsaca-verde">
                  Verifique este laudo
                </p>
                <p>Escaneie o QR ou compartilhe o link abaixo.</p>
                <p className="mt-1 break-all font-mono text-[11px]">
                  {publicUrl}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-wider text-milsaca-verde-claro">
                  Hash SHA-256
                </p>
                <p className="break-all font-mono text-[10px] text-milsaca-verde">
                  {contentHash}
                </p>
              </div>
            </div>
            <div className="text-right text-[11px] text-milsaca-verde-claro">
              <p>ID: {laudo.id.slice(0, 8)}</p>
              <p>Schema IN 8/2003 · v{laudo.schema_version}</p>
            </div>
          </CardContent>
        </Card>

        <footer className="pt-4 text-center text-xs text-milsaca-verde-claro">
          <p className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Gerado pela Milsaca — milsaca.app
          </p>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-milsaca-verde-claro">
        {label}
      </p>
      <p className="font-medium text-milsaca-verde">{value}</p>
    </div>
  );
}
