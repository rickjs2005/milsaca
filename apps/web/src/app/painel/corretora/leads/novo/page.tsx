import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { redirect } from "next/navigation";
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
import { listLeadTargets } from "../_lib/queries";
import { createLead } from "../_actions";
import { LEAD_ORIGEM_LABEL, LEAD_ORIGEM_ORDER } from "../_lib/lead-meta";
import { COFFEE_OPTIONS } from "@/lib/coffee";

export const metadata = { title: "Novo lead — Milsaca" };

type SearchParams = Promise<{ error?: string; target?: string }>;

export default async function NovoLeadPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const sp = await searchParams;
  const { produtores, contatos } = await listLeadTargets(profile.corretora_id);
  const semTargets = produtores.length === 0 && contatos.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/corretora/leads"
          className="inline-flex items-center gap-1 text-sm text-milsaca-verde-claro hover:text-milsaca-verde"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Leads
        </Link>
      </div>

      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-milsaca-verde">
          Novo lead
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Vincule a um produtor cadastrado ou a um contato pendente. Você pode
          atualizar o status e adicionar comentários depois.
        </p>
      </header>

      {semTargets ? (
        <Card className="border-milsaca-dourado/30 bg-milsaca-dourado/5">
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-milsaca-verde">
              Você ainda não tem produtores nem contatos cadastrados. Crie um
              contato primeiro pra poder vincular o lead.
            </p>
            <Button
              asChild
              className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            >
              <Link href="/painel/corretora/produtores/novo">
                <UserPlus className="mr-2 h-4 w-4" />
                Cadastrar produtor
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-base">Dados do lead</CardTitle>
            <CardDescription>
              Valor e quantidade são opcionais — preencha o que já souber.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createLead} className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="target">Produtor ou contato *</Label>
                <select
                  id="target"
                  name="target"
                  required
                  defaultValue={sp.target ?? ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Selecione...</option>
                  {produtores.length > 0 && (
                    <optgroup label="Produtores cadastrados">
                      {produtores.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                          {o.sublabel ? ` — ${o.sublabel}` : ""}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {contatos.length > 0 && (
                    <optgroup label="Contatos pendentes">
                      {contatos.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                          {o.sublabel ? ` — ${o.sublabel}` : ""}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-xs text-milsaca-verde-claro">
                  Não está aqui?{" "}
                  <Link
                    href="/painel/corretora/produtores/novo"
                    className="font-medium text-milsaca-verde hover:underline"
                  >
                    Cadastre o produtor primeiro
                  </Link>
                  .
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coffee_type">Café</Label>
                <select
                  id="coffee_type"
                  name="coffee_type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">—</option>
                  {COFFEE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bag_count">Sacas (60kg)</Label>
                <Input
                  id="bag_count"
                  name="bag_count"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="100"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="origem">Origem do lead</Label>
                <select
                  id="origem"
                  name="origem"
                  defaultValue="manual"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {LEAD_ORIGEM_ORDER.map((o) => (
                    <option key={o} value={o}>
                      {LEAD_ORIGEM_LABEL[o]}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-milsaca-verde-claro">
                  Por qual canal o produtor chegou — ajuda no analytics depois.
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="proposed_price">Valor proposto por saca (R$)</Label>
                <Input
                  id="proposed_price"
                  name="proposed_price"
                  type="text"
                  inputMode="decimal"
                  placeholder="1.850,00"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Ex.: produtor pediu retorno até sexta, prefere fechar à vista."
                />
              </div>

              {sp.error && (
                <p className="text-sm text-danger-700 sm:col-span-2">{sp.error}</p>
              )}

              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button asChild variant="outline">
                  <Link href="/painel/corretora/leads">Cancelar</Link>
                </Button>
                <SubmitButton
                  pendingLabel="Criando..."
                  className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
                >
                  Criar lead
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
