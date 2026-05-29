import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/lib/auth";
import { getComprador } from "../_lib/queries";
import { CompradorFormFields } from "../_form";
import { toggleCompradorAtivo, updateComprador } from "../_actions";

export const metadata = { title: "Comprador — Milsaca" };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function CompradorDetalhePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const { id } = await params;
  const sp = await searchParams;
  const c = await getComprador(profile.corretora_id, id);
  if (!c) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/corretora/compradores"
          className="inline-flex items-center gap-1 text-sm text-milsaca-verde-claro hover:text-milsaca-verde"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Compradores
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-milsaca-verde">
            {c.name}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-sm">
            {c.ativo ? (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                Ativo
              </Badge>
            ) : (
              <Badge variant="outline" className="text-milsaca-verde-claro">
                Inativo
              </Badge>
            )}
            {c.tipo ? (
              <span className="text-milsaca-verde-claro">· {c.tipo}</span>
            ) : null}
          </div>
        </div>
        <form action={toggleCompradorAtivo} className="inline">
          <input type="hidden" name="id" value={c.id} />
          <input
            type="hidden"
            name="ativo"
            value={c.ativo ? "false" : "true"}
          />
          <Button type="submit" variant="outline">
            {c.ativo ? "Desativar" : "Ativar"}
          </Button>
        </form>
      </header>

      {sp.saved ? (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          Atualizado.
        </div>
      ) : null}
      {sp.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {sp.error}
        </div>
      ) : null}

      <Card className="border-milsaca-cream-escuro">
        <CardHeader>
          <CardTitle className="text-base">Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateComprador} className="space-y-4">
            <input type="hidden" name="id" value={c.id} />
            <CompradorFormFields defaults={c} />
            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
              >
                Salvar alterações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
