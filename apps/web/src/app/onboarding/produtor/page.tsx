import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MunicipioAutocomplete } from "@/components/municipio-autocomplete";
import { MaskedInput } from "@/components/forms/masked-input";
import { UfSelect } from "@/components/forms/uf-select";
import { SubmitButton } from "@/components/submit-button";
import { MilsacaLogo } from "@/components/milsaca-logo";
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

  // Lista corretoras verificadas pra escolher uma "casa" opcional.
  // Usa view pública (não vaza cnpj/endereço — produtor só precisa
  // do nome e localização pra escolher).
  const supabase = await createClient();
  const { data: corretoras } = await supabase
    .from("corretoras_publicas")
    .select("id, name, city, state")
    .eq("verified", true)
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen bg-milsaca-cream">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <header className="flex items-center">
          <MilsacaLogo size={96} />
        </header>

        <div className="mt-8">
          <p className="text-sm font-medium text-milsaca-dourado">
            Boas-vindas, {user.email}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-milsaca-verde">
            Vamos começar{" "}
            <span className="text-milsaca-dourado">do básico</span>
          </h1>
          <p className="mt-3 text-sm text-milsaca-verde-claro">
            São três blocos curtos. Dá pra mudar tudo depois no Perfil.
          </p>
        </div>

        {error ? (
          <p className="mt-6 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <form
          action={completarOnboarding}
          className="mt-8 space-y-8"
        >
          <Section
            number={1}
            title="Sobre você"
            subtitle="Como te identificamos e como a corretora te encontra."
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
                <MaskedInput
                  id="cpf_cnpj"
                  type="cpf-cnpj"
                  name="cpf_cnpj"
                  required
                  defaultValue={produtor?.cpf_cnpj ?? ""}
                  validateOnBlur
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp *</Label>
                <MaskedInput
                  id="whatsapp"
                  type="phone"
                  name="whatsapp"
                  required
                  defaultValue={produtor?.whatsapp ?? profile.phone ?? ""}
                  validateOnBlur
                />
                <p className="text-[11px] text-milsaca-verde-claro/70">
                  É por aqui que a corretora vai te chamar.
                </p>
              </div>
            </div>
          </Section>

          <Section
            number={2}
            title="Sobre sua produção"
            subtitle="Onde fica a sua fazenda e o que você colhe."
          >
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
                <Label htmlFor="state">UF *</Label>
                <UfSelect
                  id="state"
                  name="state"
                  required
                  defaultValue={produtor?.state ?? "MG"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <MunicipioAutocomplete
                  name="city"
                  defaultValue={produtor?.city ?? ""}
                  uf={produtor?.state ?? "MG"}
                  ufFieldId="state"
                  placeholder="Manhuaçu"
                  required
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
          </Section>

          <Section
            number={3}
            title="Sua corretora preferida"
            subtitle="Opcional. Você pode favoritar várias depois no catálogo."
            optional
          >
            {(corretoras ?? []).length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="corretora_id">Quem te atende hoje</Label>
                <select
                  id="corretora_id"
                  name="corretora_id"
                  defaultValue={profile.corretora_id ?? ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">— escolho depois —</option>
                  {(corretoras ?? [])
                    .filter(
                      (c): c is {
                        id: string;
                        name: string;
                        city: string | null;
                        state: string | null;
                      } => !!c.id && !!c.name,
                    )
                    .map((c) => (
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
            ) : (
              <p className="text-sm text-milsaca-verde-claro">
                Ainda não há corretoras verificadas no Milsaca. Você pode
                continuar e escolher depois.
              </p>
            )}
          </Section>

          <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              asChild
              variant="outline"
              type="button"
              className="text-milsaca-verde-claro"
            >
              <Link href="/sair">Sair</Link>
            </Button>
            <SubmitButton
              size="lg"
              pendingLabel="Salvando..."
              className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            >
              Pronto, começar
            </SubmitButton>
          </div>
        </form>
      </div>
    </main>
  );
}

function Section({
  number,
  title,
  subtitle,
  optional,
  children,
}: {
  number: number;
  title: string;
  subtitle?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-milsaca-cream-escuro bg-white p-6 shadow-sm">
      <header className="mb-5 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-milsaca-verde text-milsaca-dourado">
          <span className="text-sm font-bold">{number}</span>
        </span>
        <div className="space-y-0.5">
          <h2 className="text-lg font-semibold text-milsaca-verde">
            {title}
            {optional ? (
              <span className="ml-2 rounded-full bg-milsaca-cream-escuro/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-milsaca-verde-claro">
                Opcional
              </span>
            ) : null}
          </h2>
          {subtitle ? (
            <p className="text-xs text-milsaca-verde-claro">{subtitle}</p>
          ) : null}
        </div>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
