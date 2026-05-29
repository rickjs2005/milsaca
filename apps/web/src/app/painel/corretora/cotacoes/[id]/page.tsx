import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { getProfile } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { updateCotacao } from "../_actions";

export const metadata = { title: "Editar cotação — Milsaca" };

type SP = Promise<{ error?: string; saved?: string }>;

export default async function EditCotacaoCorretoraPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SP;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("cotacoes")
    .select("id, corretora_id, specie, process, region, source, reference_date, price")
    .eq("id", id)
    .eq("corretora_id", profile.corretora_id)
    .maybeSingle();

  if (!data) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/corretora/cotacoes"
          className="inline-flex items-center gap-1 text-sm text-milsaca-verde-claro hover:text-milsaca-verde"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Cotações
        </Link>
      </div>

      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-milsaca-verde">
          Editar cotação
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Atualize o preço, processo ou data. O painel do produtor recalcula
          automaticamente.
        </p>
      </header>

      {sp.saved ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          Alterações salvas.
        </p>
      ) : null}

      <Card className="border-milsaca-cream-escuro">
        <CardHeader>
          <CardTitle className="text-base">Dados da cotação</CardTitle>
          <CardDescription>
            Preço por saca de 60kg. Use a praça pra diferenciar entre cidades.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateCotacao} className="grid gap-5 sm:grid-cols-2">
            <input type="hidden" name="id" value={data.id} />

            <div className="space-y-2">
              <Label htmlFor="specie">Espécie *</Label>
              <select
                id="specie"
                name="specie"
                required
                defaultValue={data.specie ?? "arabica"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="arabica">Arábica</option>
                <option value="conillon">Conillón</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="process">Processo</Label>
              <select
                id="process"
                name="process"
                defaultValue={data.process ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">—</option>
                <option value="natural">Natural</option>
                <option value="cereja_descascado">Cereja descascado</option>
                <option value="cd_desmucilado">CD desmucilado</option>
                <option value="despolpado">Despolpado</option>
                <option value="fermentacao_induzida">
                  Fermentação induzida
                </option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_date">Data de referência *</Label>
              <Input
                id="reference_date"
                name="reference_date"
                type="date"
                required
                defaultValue={data.reference_date}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço da saca (R$) *</Label>
              <Input
                id="price"
                name="price"
                type="text"
                inputMode="decimal"
                required
                defaultValue={String(data.price).replace(".", ",")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Praça</Label>
              <Input
                id="region"
                name="region"
                defaultValue={data.region ?? ""}
                placeholder="Manhuaçu / MG"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Fonte</Label>
              <Input
                id="source"
                name="source"
                defaultValue={data.source ?? ""}
                placeholder="CEPEA, manual, etc."
              />
            </div>

            {sp.error ? (
              <p className="text-sm text-rose-700 sm:col-span-2">{sp.error}</p>
            ) : null}

            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button asChild variant="outline">
                <Link href="/painel/corretora/cotacoes">Cancelar</Link>
              </Button>
              <SubmitButton
                pendingLabel="Salvando..."
                className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
              >
                Salvar alterações
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
