import Link from "next/link";
import { ArrowLeft, UserPlus, AlertTriangle, Link2 } from "lucide-react";
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
import {
  listProdutoresReais,
  getLeadForContrato,
  nextContratoCode,
} from "../_lib/queries";
import { createContrato } from "../_actions";
import { listCompradoresOptions } from "../../compradores/_lib/queries";
import { blockIfNoActiveSubscription } from "../../_lib/subscription-gate";

export const metadata = { title: "Novo contrato — Milsaca" };

type SearchParams = Promise<{ error?: string; lead?: string }>;

export default async function NovoContratoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const block = await blockIfNoActiveSubscription(profile.corretora_id, {
    action: "criar contratos",
    backHref: "/painel/corretora/contratos",
  });
  if (block) return block;

  const sp = await searchParams;

  const [produtores, compradores, lead, suggestedCode] = await Promise.all([
    listProdutoresReais(profile.corretora_id),
    listCompradoresOptions(profile.corretora_id),
    sp.lead
      ? getLeadForContrato(profile.corretora_id, sp.lead)
      : Promise.resolve(null),
    nextContratoCode(profile.corretora_id),
  ]);

  const leadProdutorMissing = lead && !lead.produtor_id;
  const totalEstimado =
    lead?.proposed_price != null && lead?.bag_count != null
      ? (lead.proposed_price * lead.bag_count).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/corretora/contratos"
          className="inline-flex items-center gap-1 text-sm text-milsaca-verde-claro hover:text-milsaca-verde"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Contratos
        </Link>
      </div>

      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Novo contrato
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Contrato exige produtor com conta na plataforma — o produtor precisa
          aceitar pra valer.
        </p>
      </header>

      {lead && !leadProdutorMissing && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-emerald-900">
            <Link2 className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">
                Convertendo lead de {lead.produtor_nome ?? "produtor"}
              </p>
              <p className="text-xs">
                Dados pré-preenchidos com base no lead. Ajuste o que precisar.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {leadProdutorMissing && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="flex items-start gap-3 py-4 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-2">
              <p className="font-medium">
                Esse lead está vinculado a um contato sombra
              </p>
              <p className="text-xs">
                Contrato exige produtor com conta real. Convide o produtor pelo
                WhatsApp pra ele criar conta com o mesmo email, e tente
                novamente — os leads migram automaticamente.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-2">
                <Link href={`/painel/corretora/leads/${lead.id}`}>
                  Voltar pro lead
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {produtores.length === 0 ? (
        <Card className="border-milsaca-dourado/30 bg-milsaca-dourado/5">
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-milsaca-verde">
              Você ainda não tem produtores com conta na plataforma vinculados à
              corretora.
            </p>
            <p className="text-xs text-milsaca-verde-claro">
              Cadastre como contato e convide pelo WhatsApp pra ele criar conta.
            </p>
            <Button
              asChild
              className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            >
              <Link href="/painel/corretora/produtores">
                <UserPlus className="mr-2 h-4 w-4" />
                Gerenciar produtores
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-base">Dados do contrato</CardTitle>
            <CardDescription>
              O código é gerado automaticamente, mas você pode editar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createContrato} className="grid gap-5 sm:grid-cols-2">
              {lead && (
                <input type="hidden" name="lead_id" value={lead.id} />
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="produtor_id">Produtor *</Label>
                <select
                  id="produtor_id"
                  name="produtor_id"
                  required
                  defaultValue={lead?.produtor_id ?? ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Selecione...</option>
                  {produtores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                      {p.sublabel ? ` — ${p.sublabel}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="code">Código do contrato *</Label>
                <Input
                  id="code"
                  name="code"
                  required
                  defaultValue={suggestedCode}
                />
                <p className="text-xs text-milsaca-verde-claro">
                  Formato sugerido: <code>{suggestedCode}</code>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coffee_type">Café</Label>
                <select
                  id="coffee_type"
                  name="coffee_type"
                  defaultValue={lead?.coffee_type ?? ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">—</option>
                  <option value="Arábica">Arábica</option>
                  <option value="Conillón">Conillón</option>
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
                  defaultValue={lead?.bag_count ?? ""}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="total_value">Valor total (R$)</Label>
                <Input
                  id="total_value"
                  name="total_value"
                  type="text"
                  inputMode="decimal"
                  placeholder="185.000,00"
                  defaultValue={totalEstimado}
                />
                {lead?.proposed_price != null && lead?.bag_count != null && (
                  <p className="text-xs text-milsaca-verde-claro">
                    Sugestão calculada de R${" "}
                    {lead.proposed_price.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    × {lead.bag_count} sacas.
                  </p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2 border-t border-milsaca-cream-escuro pt-4">
                <Label htmlFor="comprador_id">Comprador</Label>
                {compradores.length === 0 ? (
                  <p className="text-xs text-milsaca-verde-claro">
                    Nenhum comprador ativo.{" "}
                    <Link
                      href="/painel/corretora/compradores/novo"
                      className="text-milsaca-dourado hover:underline"
                    >
                      Cadastrar um agora
                    </Link>
                    .
                  </p>
                ) : (
                  <select
                    id="comprador_id"
                    name="comprador_id"
                    defaultValue=""
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">— sem comprador definido —</option>
                    {compradores.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="comissao_pct">Comissão (%)</Label>
                <Input
                  id="comissao_pct"
                  name="comissao_pct"
                  type="text"
                  inputMode="decimal"
                  placeholder="1,0"
                  defaultValue="1,0"
                />
                <p className="text-xs text-milsaca-verde-claro">
                  Calculada sobre o valor total.
                </p>
              </div>

              {sp.error && (
                <p className="text-sm text-rose-700 sm:col-span-2">{sp.error}</p>
              )}

              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button asChild variant="outline">
                  <Link href="/painel/corretora/contratos">Cancelar</Link>
                </Button>
                <SubmitButton
                  pendingLabel="Criando..."
                  className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
                  disabled={!!leadProdutorMissing}
                >
                  Criar contrato
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
