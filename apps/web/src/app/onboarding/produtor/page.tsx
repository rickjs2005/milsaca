import Link from "next/link";
import { redirect } from "next/navigation";
import { Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@milsaca/db/web/server";
import { getProfile, requireUser } from "@/lib/auth";
import {
  getProdutorByProfileId,
  needsOnboarding,
  SPECIE_LABEL,
} from "@/app/painel/produtor/_lib/produtor";
import { completarOnboarding } from "./_actions";

export const metadata = { title: "Bem-vindo — Milsaca" };

type SearchParams = Promise<{ error?: string }>;

export default async function OnboardingProdutorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser("/onboarding/produtor");
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  const produtor = await getProdutorByProfileId(profile.id);

  // Se já está completo, manda pro painel
  if (!needsOnboarding(profile, produtor)) {
    redirect("/painel/produtor");
  }

  const { error } = await searchParams;

  // Lista corretoras verificadas pra escolher uma "casa" opcional
  const supabase = await createClient();
  const { data: corretoras } = await supabase
    .from("corretoras")
    .select("id, name, city, state")
    .eq("verified", true)
    .order("name", { ascending: true });

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
            Bem-vindo, {user.email}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-milsaca-verde">
            Conte um pouco{" "}
            <span className="text-milsaca-dourado">sobre você</span>
          </h1>
          <p className="mt-3 text-sm text-milsaca-verde-claro">
            Dados básicos pra começar. Você pode completar o resto depois no
            seu Perfil.
          </p>
        </div>

        {error ? (
          <p className="mt-6 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <form
          action={completarOnboarding}
          className="mt-8 space-y-5 rounded-2xl border border-milsaca-cream-escuro bg-white p-6 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="full_name">Seu nome completo *</Label>
            <Input
              id="full_name"
              name="full_name"
              required
              defaultValue={profile.full_name ?? ""}
              placeholder="Ex: João da Silva"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj">CPF ou CNPJ *</Label>
              <Input
                id="cpf_cnpj"
                name="cpf_cnpj"
                required
                inputMode="numeric"
                defaultValue={produtor?.cpf_cnpj ?? ""}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                required
                defaultValue={produtor?.whatsapp ?? profile.phone ?? ""}
                placeholder="(33) 99999-9999"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fazenda_nome">Nome da fazenda *</Label>
            <Input
              id="fazenda_nome"
              name="fazenda_nome"
              required
              defaultValue={produtor?.fazenda_nome ?? ""}
              placeholder="Ex: Sítio Boa Vista"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                name="city"
                required
                defaultValue={produtor?.city ?? ""}
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
                defaultValue={produtor?.state ?? ""}
                placeholder="MG"
                className="uppercase"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specie">Você produz</Label>
            <select
              id="specie"
              name="specie"
              defaultValue={produtor?.specie ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">—</option>
              {Object.entries(SPECIE_LABEL).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {(corretoras ?? []).length > 0 ? (
            <div className="space-y-2 border-t border-milsaca-cream-escuro pt-4">
              <Label htmlFor="corretora_id">Corretora de preferência</Label>
              <select
                id="corretora_id"
                name="corretora_id"
                defaultValue={profile.corretora_id ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">— escolho depois —</option>
                {(corretoras ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.city ? ` — ${c.city}` : ""}
                    {c.state ? `/${c.state}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-milsaca-verde-claro">
                Você pode mudar ou adicionar outras corretoras depois.
              </p>
            </div>
          ) : null}

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
