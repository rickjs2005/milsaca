import Link from "next/link";
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
import { createCotacao } from "../_actions";

export const metadata = { title: "Nova cotação — Milsaca" };

type SearchParams = Promise<{ error?: string }>;

function todayISO() {
  // YYYY-MM-DD em horário local sem dependência de Date toISOString (UTC)
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function NovaCotacaoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

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
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Nova cotação
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Registre o preço da saca por espécie/processo. O painel do produtor
          recalcula a variação automaticamente.
        </p>
      </header>

      <Card className="border-milsaca-cream-escuro">
        <CardHeader>
          <CardTitle className="text-base">Dados da cotação</CardTitle>
          <CardDescription>
            Preço por saca de 60kg. Use a praça pra diferenciar Manhuaçu, Santos
            etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCotacao} className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="specie">Espécie *</Label>
              <select
                id="specie"
                name="specie"
                required
                defaultValue="arabica"
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
                defaultValue={todayISO()}
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
                placeholder="1.850,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Praça</Label>
              <Input
                id="region"
                name="region"
                placeholder="Manhuaçu / MG"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Fonte</Label>
              <Input
                id="source"
                name="source"
                placeholder="CEPEA, manual, etc."
              />
            </div>

            {sp.error && (
              <p className="text-sm text-rose-700 sm:col-span-2">{sp.error}</p>
            )}

            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button asChild variant="outline">
                <Link href="/painel/corretora/cotacoes">Cancelar</Link>
              </Button>
              <SubmitButton
                pendingLabel="Cadastrando..."
                className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
              >
                Cadastrar cotação
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
