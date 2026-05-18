import Link from "next/link";
import { redirect } from "next/navigation";
import { Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProfile, requireUser } from "@/lib/auth";
import {
  getCorretoraOnboarding,
  needsCorretoraOnboarding,
} from "@/app/painel/corretora/_lib/corretora";
import { completarOnboardingCorretora } from "./_actions";

export const metadata = { title: "Bem-vinda — Corretora · Milsaca" };

type SearchParams = Promise<{ error?: string }>;

export default async function OnboardingCorretoraPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser("/onboarding/corretora");
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  if (!profile.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const corretora = await getCorretoraOnboarding(profile.corretora_id);
  if (!needsCorretoraOnboarding(profile, corretora)) {
    redirect("/painel/corretora");
  }

  const { error } = await searchParams;

  return (
    <main className="min-h-screen bg-milsaca-cream">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <header className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-milsaca-verde text-milsaca-dourado">
            <Coffee className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-milsaca-verde">
            Milsaca
          </span>
        </header>

        <div className="mt-8">
          <p className="text-sm font-medium text-milsaca-dourado">
            Bem-vinda, {corretora?.name}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-milsaca-verde">
            Complete os dados{" "}
            <span className="text-milsaca-dourado">da sua corretora</span>
          </h1>
          <p className="mt-3 text-sm text-milsaca-verde-claro">
            Isso aparece pro produtor quando ele te vê no diretório e nos
            espelhos de contrato. Você pode editar tudo depois em Perfil.
          </p>
        </div>

        {error ? (
          <p className="mt-6 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <form
          action={completarOnboardingCorretora}
          className="mt-8 space-y-6 rounded-2xl border border-milsaca-cream-escuro bg-white p-6 shadow-sm"
        >
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-milsaca-dourado">
              Operador
            </h2>
            <Label htmlFor="full_name">Seu nome completo *</Label>
            <Input
              id="full_name"
              name="full_name"
              required
              defaultValue={profile.full_name ?? ""}
              placeholder="Ex: Ana Souza"
            />
            <p className="text-xs text-milsaca-verde-claro/70">
              Identifica quem está operando pela corretora — aparece nos
              espelhos e nas mensagens pro produtor.
            </p>
          </section>

          <section className="space-y-4 border-t border-milsaca-cream-escuro pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-milsaca-dourado">
              Identificação da corretora
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  name="cnpj"
                  required
                  inputMode="numeric"
                  defaultValue={corretora?.cnpj ?? ""}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp *</Label>
                <Input
                  id="phone"
                  name="phone"
                  required
                  defaultValue={corretora?.phone ?? user.email ?? ""}
                  placeholder="(33) 99999-9999"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição curta</Label>
              <textarea
                id="descricao"
                name="descricao"
                rows={2}
                defaultValue={corretora?.descricao ?? ""}
                placeholder="Corretora de café especializada em Arábica do Caparaó"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-milsaca-cream-escuro pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-milsaca-dourado">
              Endereço
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  name="cep"
                  inputMode="numeric"
                  placeholder="36900-000"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="endereco">Endereço (rua, nº)</Label>
                <Input
                  id="endereco"
                  name="endereco"
                  placeholder="Av. Getúlio Vargas, 1234"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input id="bairro" name="bairro" placeholder="Centro" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  name="city"
                  required
                  defaultValue={corretora?.city ?? ""}
                  placeholder="Manhuaçu"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">UF *</Label>
                <Input
                  id="state"
                  name="state"
                  required
                  maxLength={2}
                  defaultValue={corretora?.state ?? ""}
                  placeholder="MG"
                  className="uppercase"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-milsaca-cream-escuro pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-milsaca-dourado">
              Contato adicional
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telefone_fixo">Telefone fixo</Label>
                <Input
                  id="telefone_fixo"
                  name="telefone_fixo"
                  placeholder="(33) 3333-3333"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_url">Site</Label>
                <Input
                  id="site_url"
                  name="site_url"
                  type="url"
                  placeholder="https://cafecia.com.br"
                />
              </div>
            </div>
          </section>

          <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              asChild
              variant="outline"
              type="button"
              className="text-milsaca-verde-claro"
            >
              <Link href="/sair">Sair</Link>
            </Button>
            <Button
              type="submit"
              size="lg"
              className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            >
              Começar
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
