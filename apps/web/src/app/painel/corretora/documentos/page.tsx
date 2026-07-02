import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, FolderOpen } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getProfile } from "@/lib/auth";
import {
  CATEGORIA_LABEL,
  type DocumentoCategoria,
} from "@/lib/documentos";
import { listDocumentos, listVinculoOptions } from "./_lib/queries";
import {
  baixarDocumento,
  excluirDocumento,
  uploadDocumento,
} from "./_actions";
import { DocumentosList } from "./_components/documentos-list";
import { UploadDocumentoForm } from "./_components/upload-documento-form";

export const metadata = { title: "Documentos — Painel da corretora" };

const DOCUMENTOS = "/painel/corretora/documentos";
const CATEGORIAS = Object.keys(CATEGORIA_LABEL) as DocumentoCategoria[];

type SearchParams = Promise<{
  categoria?: string;
  saved?: string;
  error?: string;
}>;

function isCategoria(v: string | undefined): v is DocumentoCategoria {
  return !!v && (CATEGORIAS as readonly string[]).includes(v);
}

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const sp = await searchParams;
  const categoria = isCategoria(sp.categoria) ? sp.categoria : undefined;

  const [docs, vinculos] = await Promise.all([
    listDocumentos({ categoria }),
    listVinculoOptions(),
  ]);

  const backComFiltro = categoria
    ? `${DOCUMENTOS}?categoria=${categoria}`
    : DOCUMENTOS;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-milsaca-cafezal">Documentos</h1>
        <p className="mt-1 max-w-2xl text-body-sm text-neutral-600">
          Central de documentos da corretora: CAR, certificados, procurações,
          notas e contratos assinados — com validade e vínculo a lotes,
          contratos e produtores.
        </p>
      </header>

      {sp.saved && (
        <div className="flex items-center gap-2 rounded-md border border-success-100 bg-success-50 px-4 py-2 text-sm text-success-700">
          <CheckCircle2 className="h-4 w-4" />
          {sp.saved}
        </div>
      )}
      {sp.error && (
        <div className="rounded-md border border-danger-100 bg-danger-50 px-4 py-2 text-sm text-danger-700">
          {sp.error}
        </div>
      )}

      <Card className="border-milsaca-cream-escuro">
        <CardHeader>
          <CardTitle className="text-base">Enviar documento</CardTitle>
          <CardDescription>
            PDF ou imagem, até 10MB. O vínculo define quem enxerga o documento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadDocumentoForm
            action={uploadDocumento}
            back={backComFiltro}
            lotes={vinculos.lotes}
            contratos={vinculos.contratos}
            produtores={vinculos.produtores}
          />
        </CardContent>
      </Card>

      <Card className="border-milsaca-cream-escuro">
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-4 w-4 text-milsaca-verde-claro" />
            Todos os documentos
          </CardTitle>
          <div className="flex flex-wrap gap-2" aria-label="Filtrar por categoria">
            <Link
              href={DOCUMENTOS}
              className={cn(
                "rounded-pill border px-3 py-1 text-caption font-medium transition-colors",
                !categoria
                  ? "border-milsaca-verde bg-milsaca-verde text-milsaca-cream"
                  : "border-neutral-200 text-neutral-600 hover:border-milsaca-verde",
              )}
            >
              Todas
            </Link>
            {CATEGORIAS.map((c) => (
              <Link
                key={c}
                href={`${DOCUMENTOS}?categoria=${c}`}
                className={cn(
                  "rounded-pill border px-3 py-1 text-caption font-medium transition-colors",
                  categoria === c
                    ? "border-milsaca-verde bg-milsaca-verde text-milsaca-cream"
                    : "border-neutral-200 text-neutral-600 hover:border-milsaca-verde",
                )}
              >
                {CATEGORIA_LABEL[c]}
              </Link>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <DocumentosList
            docs={docs}
            back={backComFiltro}
            baixarAction={baixarDocumento}
            excluirAction={excluirDocumento}
            showVinculo
          />
        </CardContent>
      </Card>
    </div>
  );
}
