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
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { listProdutores } from "../_lib/queries";
import { createLote } from "../_actions";
import { blockIfNoActiveSubscription } from "../../_lib/subscription-gate";

export const metadata = { title: "Novo lote — Milsaca" };

type SearchParams = Promise<{ error?: string }>;

export default async function NovoLotePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const block = await blockIfNoActiveSubscription(profile.corretora_id, {
    action: "criar lotes",
    backHref: "/painel/corretora/lotes",
  });
  if (block) return block;

  const sp = await searchParams;
  const produtores = await listProdutores();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/corretora/lotes"
          className="inline-flex items-center gap-1 text-sm text-milsaca-verde-claro hover:text-milsaca-verde"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Lotes
        </Link>
      </div>

      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-milsaca-verde">
          Novo lote
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Cadastre os dados básicos. A classificação COB é feita em seguida.
        </p>
      </header>

      <Card className="border-milsaca-cream-escuro">
        <CardHeader>
          <CardTitle className="text-base">Dados do lote</CardTitle>
          <CardDescription>
            Identificação e atributos pré-classificação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createLote} className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                name="codigo"
                placeholder="LM-2026-0001"
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="safra">Safra</Label>
              <Input id="safra" name="safra" placeholder="2025/2026" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="produtor_id">Produtor *</Label>
              {produtores.length === 0 ? (
                <p className="text-sm text-rose-700">
                  Nenhum produtor cadastrado. Peça ao produtor para entrar pelo
                  /entrar antes de cadastrar lotes.
                </p>
              ) : (
                <select
                  id="produtor_id"
                  name="produtor_id"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Selecione...</option>
                  {produtores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>

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
              <Label htmlFor="processo">Processo pós-colheita</Label>
              <select
                id="processo"
                name="processo"
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
              <Label htmlFor="peso_sacas">Peso (sacas de 60kg)</Label>
              <Input
                id="peso_sacas"
                name="peso_sacas"
                type="number"
                step="0.01"
                placeholder="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="umidade_inicial">Umidade inicial (%)</Label>
              <Input
                id="umidade_inicial"
                name="umidade_inicial"
                type="number"
                step="0.1"
                placeholder="11,5"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="descricao">Descrição / observações</Label>
              <textarea
                id="descricao"
                name="descricao"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Ex.: lote do talhão norte, colheita 12/05"
              />
            </div>

            {sp.error && (
              <p className="text-sm text-rose-700 sm:col-span-2">{sp.error}</p>
            )}

            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button asChild variant="outline">
                <Link href="/painel/corretora/lotes">Cancelar</Link>
              </Button>
              <Button
                type="submit"
                className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
                disabled={produtores.length === 0}
              >
                Cadastrar lote
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
