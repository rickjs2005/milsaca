import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UnidadeInput } from "@/components/produtor/UnidadeInput/UnidadeInput";
import { registrarCafe } from "../_actions";

export const metadata = { title: "Registrar café — Painel do produtor" };

const selectClass =
  "flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-body-sm text-milsaca-cafezal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

type SearchParams = Promise<{ error?: string }>;

export default async function RegistrarCafePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/painel/produtor/laudos"
          className="inline-flex items-center gap-1 text-body-sm text-milsaca-dourado-texto hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Meu Café
        </Link>
      </div>

      <header>
        <h1 className="text-h1 text-milsaca-cafezal">Registrar meu café</h1>
        <p className="mt-1 text-body-sm text-neutral-600">
          Informe a quantidade em bags, sacas ou kg — o sistema converte sozinho.
          O café entra no seu estoque; depois você chama uma corretora pra vender.
        </p>
      </header>

      <Card>
        <CardContent className="p-card">
          <form action={registrarCafe} className="space-y-5">
            {/* Quantidade — o coração da tela */}
            <UnidadeInput />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="specie">Espécie *</Label>
                <select
                  id="specie"
                  name="specie"
                  required
                  defaultValue="arabica"
                  className={selectClass}
                >
                  <option value="arabica">Arábica</option>
                  <option value="conillon">Conilón</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="processo">Processo pós-colheita</Label>
                <select id="processo" name="processo" className={selectClass}>
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

              <div className="space-y-1.5">
                <Label htmlFor="safra">Safra</Label>
                <Input id="safra" name="safra" placeholder="2025/2026" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descricao">Observações</Label>
              <textarea
                id="descricao"
                name="descricao"
                rows={3}
                className="flex w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-body-sm text-milsaca-cafezal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                placeholder="Ex.: café do talhão norte, colheita de maio"
              />
            </div>

            {sp.error ? (
              <p className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700">
                {sp.error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button asChild variant="outline">
                <Link href="/painel/produtor/laudos">Cancelar</Link>
              </Button>
              <Button type="submit" variant="primary">
                Registrar café
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
