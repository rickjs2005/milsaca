import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
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
import { MaskedInput } from "@/components/forms/masked-input";
import { UfSelect } from "@/components/forms/uf-select";
import { SubmitButton } from "@/components/submit-button";
import { createContato } from "../_actions";

export const metadata = { title: "Novo produtor — Milsaca" };

type SearchParams = Promise<{ error?: string }>;

export default async function NovoProdutorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/corretora/produtores"
          className="inline-flex items-center gap-1 text-sm text-milsaca-verde-claro hover:text-milsaca-verde"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Produtores
        </Link>
      </div>

      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-milsaca-verde">
          Novo produtor
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Cadastre o contato mesmo se o produtor ainda não tem conta na
          plataforma.
        </p>
      </header>

      <Card className="border-milsaca-dourado/30 bg-milsaca-dourado/5">
        <CardContent className="flex gap-3 py-4 text-sm text-milsaca-verde">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-milsaca-dourado" />
          <div className="space-y-1">
            <p className="font-medium">Como funciona o cadastro sombra</p>
            <p className="text-milsaca-verde-claro">
              Você pode criar leads e propostas pra este produtor desde já.
              Quando ele fizer login com o mesmo email, todo o histórico vai
              migrar pra conta dele automaticamente.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-milsaca-cream-escuro">
        <CardHeader>
          <CardTitle className="text-base">Dados do produtor</CardTitle>
          <CardDescription>
            Email ou telefone é obrigatório. O email serve pra fazer o vínculo
            automático no signup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createContato} className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="full_name">Nome completo *</Label>
              <Input
                id="full_name"
                name="full_name"
                required
                placeholder="Ex.: João da Silva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="joao@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <MaskedInput
                id="phone"
                type="phone"
                name="phone"
                validateOnBlur
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fazenda_nome">Fazenda</Label>
              <Input
                id="fazenda_nome"
                name="fazenda_nome"
                placeholder="Ex.: Sítio Boa Vista"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" name="city" placeholder="Manhuaçu" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">UF</Label>
              <UfSelect id="state" name="state" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cpf_cnpj">CPF / CNPJ</Label>
              <MaskedInput
                id="cpf_cnpj"
                type="cpf-cnpj"
                name="cpf_cnpj"
                validateOnBlur
              />
              <p className="text-xs text-milsaca-verde-claro">
                Usado nos contratos. Só você vê — não fica público.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="car">CAR</Label>
              <Input
                id="car"
                name="car"
                placeholder="Cadastro Ambiental Rural"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="caepf">CAEPF</Label>
              <Input
                id="caepf"
                name="caepf"
                placeholder="Cadastro de Atividade Econômica PF"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Ex.: produz arábica natural, sempre tira 100 sacas em julho."
              />
            </div>

            {sp.error && (
              <p className="text-sm text-danger-700 sm:col-span-2">{sp.error}</p>
            )}

            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button asChild variant="outline">
                <Link href="/painel/corretora/produtores">Cancelar</Link>
              </Button>
              <SubmitButton
                pendingLabel="Cadastrando..."
                className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
              >
                Cadastrar produtor
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
