import { redirect } from "next/navigation";
import { CheckCircle2, FolderOpen, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import {
  CATEGORIA_LABEL,
  CATEGORIAS_PRODUTOR,
} from "@/lib/documentos";
import { getProdutorByProfileId } from "../_lib/produtor";
import type { DocumentoRow } from "../../corretora/documentos/_lib/queries";
import { DocumentosList } from "../../corretora/documentos/_components/documentos-list";
import {
  baixarMeuDocumento,
  excluirMeuDocumento,
  uploadMeuDocumento,
} from "./_actions";

export const metadata = { title: "Meus documentos — Milsaca" };

const MEUS_DOCS = "/painel/produtor/documentos";

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function MeusDocumentosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  const produtor = await getProdutorByProfileId(profile.id);
  if (!produtor) redirect("/painel/produtor");
  const sp = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("documentos")
    .select("*")
    .eq("owner_kind", "produtor")
    .eq("owner_id", produtor.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  const docs = (data ?? []) as DocumentoRow[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-milsaca-cafezal">Meus documentos</h1>
        <p className="mt-1 max-w-2xl text-body-sm text-neutral-600">
          Guarde aqui seu CAR, ITR e certificados. As corretoras com quem você
          negocia conseguem ver esses documentos — isso agiliza contratos e a
          venda do seu café.
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
          <CardDescription>PDF ou foto, até 10MB.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={uploadMeuDocumento} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="meudoc-titulo">Título</Label>
              <Input
                id="meudoc-titulo"
                name="titulo"
                maxLength={160}
                required
                placeholder="Ex.: CAR — Sítio Boa Vista"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meudoc-categoria">Categoria</Label>
              <Select id="meudoc-categoria" name="categoria" defaultValue="car">
                {CATEGORIAS_PRODUTOR.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIA_LABEL[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meudoc-valido">Válido até (opcional)</Label>
              <Input id="meudoc-valido" name="valido_ate" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meudoc-arquivo">Arquivo</Label>
              <Input
                id="meudoc-arquivo"
                name="arquivo"
                type="file"
                accept="application/pdf,image/*"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton variant="primary" pendingLabel="Enviando…">
                Enviar documento
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-milsaca-cream-escuro">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-4 w-4 text-milsaca-verde-claro" />
            Enviados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentosList
            docs={docs}
            back={MEUS_DOCS}
            baixarAction={baixarMeuDocumento}
            excluirAction={excluirMeuDocumento}
          />
        </CardContent>
      </Card>

      <Card className="border-milsaca-cream-escuro bg-milsaca-cream-escuro/30">
        <CardContent className="flex items-start gap-3 py-4 text-body-sm text-milsaca-verde-claro">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            A partir de 2026/2027, quem compra café para exportar à Europa vai
            exigir comprovação de origem (CAR e localização da lavoura). Deixar
            seus documentos aqui adianta esse processo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
