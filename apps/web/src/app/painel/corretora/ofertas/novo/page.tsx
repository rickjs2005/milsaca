import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { getProfile } from "@/lib/auth";
import { listLotesParaOferta } from "../_lib/queries";
import { listCompradores } from "../../compradores/_lib/queries";
import { createOferta } from "../_actions";

export const metadata = { title: "Nova oferta — Painel da corretora" };

const SPECIE_LABEL: Record<string, string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};

type SearchParams = Promise<{ lote_id?: string }>;

export default async function NovaOfertaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const sp = await searchParams;
  const [compradores, lotes] = await Promise.all([
    listCompradores(profile.corretora_id),
    listLotesParaOferta(profile.corretora_id),
  ]);
  const ativos = compradores.filter((c) => c.ativo);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/corretora/ofertas"
          className="inline-flex items-center gap-1 text-sm text-milsaca-verde-claro hover:text-milsaca-verde"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Ofertas
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-milsaca-verde sm:text-3xl">
          Nova oferta a comprador
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Registre a oferta que você fez (ou vai fazer) a uma cafeeira/comprador.
          É controle — a conversa segue no WhatsApp.
        </p>
      </header>

      {ativos.length === 0 ? (
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
              <Building2 className="h-6 w-6" />
            </span>
            <p className="text-sm text-milsaca-verde">
              Nenhum comprador ativo.
            </p>
            <p className="text-xs text-milsaca-verde-claro">
              Cadastre uma cafeeira/comprador para registrar ofertas.
            </p>
            <Button
              asChild
              size="sm"
              className="mt-2 bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            >
              <Link href="/painel/corretora/compradores/novo">Novo comprador</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-base">Dados da oferta</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createOferta} className="space-y-5">
              <input
                type="hidden"
                name="redirect_to"
                value="/painel/corretora/ofertas"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="comprador_id">Comprador</Label>
                  <select
                    id="comprador_id"
                    name="comprador_id"
                    required
                    defaultValue=""
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="" disabled>
                      Selecione…
                    </option>
                    {ativos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.city ? ` · ${c.city}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lote_id">Lote (opcional)</Label>
                  <select
                    id="lote_id"
                    name="lote_id"
                    defaultValue={sp.lote_id ?? ""}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">— sem lote específico —</option>
                    {lotes.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.codigo}
                        {l.specie ? ` · ${SPECIE_LABEL[l.specie] ?? l.specie}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="preco_saca">Preço por saca (R$)</Label>
                  <Input
                    id="preco_saca"
                    name="preco_saca"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex.: 1.650,00"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bag_count">Sacas (opcional)</Label>
                  <Input
                    id="bag_count"
                    name="bag_count"
                    type="number"
                    min="0"
                    placeholder="Ex.: 150"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="validade_ate">Validade da oferta (opcional)</Label>
                <Input id="validade_ate" name="validade_ate" type="date" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mensagem">Mensagem / observações (opcional)</Label>
                <textarea
                  id="mensagem"
                  name="mensagem"
                  rows={3}
                  maxLength={500}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Ex.: arábica bebida dura, entrega imediata, pagamento 7 dias"
                />
              </div>

              <SubmitButton
                pendingLabel="Registrando..."
                className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
              >
                Registrar oferta
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
