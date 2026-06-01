import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { getProfile } from "@/lib/auth";
import { requireCorretoraDono } from "../../_lib/corretora";
import { listContratosParaPagamento } from "../_lib/queries";
import { createPagamento } from "../_actions";

export const metadata = { title: "Registrar pagamento — Painel da corretora" };

function formatBRL(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export default async function NovoPagamentoPage() {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  requireCorretoraDono(profile);
  const contratos = await listContratosParaPagamento(profile.corretora_id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/corretora/pagamentos"
          className="inline-flex items-center gap-1 text-sm text-milsaca-verde-claro hover:text-milsaca-verde"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Pagamentos
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-milsaca-verde sm:text-3xl">
          Registrar pagamento
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Vincule a um contrato — o produtor é definido por ele. Líquido = bruto
          − descontos. É só controle: o repasse acontece fora da plataforma.
        </p>
      </header>

      {contratos.length === 0 ? (
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
              <FileText className="h-6 w-6" />
            </span>
            <p className="text-sm text-milsaca-verde">
              Nenhum contrato ainda.
            </p>
            <p className="text-xs text-milsaca-verde-claro">
              O pagamento é registrado a partir de um contrato. Crie um primeiro.
            </p>
            <Button
              asChild
              size="sm"
              className="mt-2 bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            >
              <Link href="/painel/corretora/contratos/novo">Novo contrato</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-base">Dados do repasse</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createPagamento} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="contrato_id">Contrato</Label>
                <select
                  id="contrato_id"
                  name="contrato_id"
                  required
                  defaultValue=""
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="" disabled>
                    Selecione um contrato…
                  </option>
                  {contratos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.produtor_nome}
                      {c.total_value != null ? ` · ${formatBRL(c.total_value)}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="valor_bruto">Valor bruto (R$)</Label>
                  <Input
                    id="valor_bruto"
                    name="valor_bruto"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex.: 1.500,00"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="descontos">Descontos (R$)</Label>
                  <Input
                    id="descontos"
                    name="descontos"
                    type="text"
                    inputMode="decimal"
                    placeholder="Frete, sacaria, comissão… (opcional)"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="data_prevista">Data prevista (opcional)</Label>
                <Input id="data_prevista" name="data_prevista" type="date" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="observacoes">Observações (opcional)</Label>
                <textarea
                  id="observacoes"
                  name="observacoes"
                  rows={3}
                  maxLength={500}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Ex.: pagamento à vista após conferência da entrega"
                />
              </div>

              <SubmitButton
                pendingLabel="Registrando..."
                className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
              >
                Registrar pagamento
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
