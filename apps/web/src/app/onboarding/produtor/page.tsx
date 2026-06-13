import { redirect } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MunicipioAutocomplete } from "@/components/municipio-autocomplete";
import { MaskedInput } from "@/components/forms/masked-input";
import { UfSelect } from "@/components/forms/uf-select";
import { SubmitButton } from "@/components/submit-button";
import { SignOutButton } from "@/components/sign-out-button";
import { MilsacaLogo } from "@/components/milsaca-logo";
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

  return (
    <main className="min-h-screen bg-milsaca-cream">
      <div className="mx-auto max-w-lg px-5 py-10">
        <header className="flex items-center justify-between">
          <MilsacaLogo size={80} />
          <SignOutButton className="text-sm font-medium text-milsaca-verde-claro underline-offset-4 hover:underline">
            Sair
          </SignOutButton>
        </header>

        <div className="mt-6">
          <h1 className="text-2xl font-bold tracking-tight text-milsaca-verde">
            Bem-vindo ao Milsaca
          </h1>
          <p className="mt-2 text-sm text-milsaca-verde-claro">
            Só o essencial pra começar. O resto dá pra completar depois no Perfil.
          </p>
        </div>

        {error ? (
          <p className="mt-5 rounded-md border border-danger-100 bg-danger-50 px-4 py-2 text-sm text-danger-700">
            {error}
          </p>
        ) : null}

        <form action={completarOnboarding} className="mt-6 space-y-5">
          {/* Obrigatório: identidade + contato */}
          <section className="rounded-2xl border border-milsaca-cream-escuro bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-milsaca-verde">
              Seus dados
            </h2>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nome completo *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  required
                  defaultValue={profile.full_name ?? ""}
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp">WhatsApp *</Label>
                <MaskedInput
                  id="whatsapp"
                  type="phone"
                  name="whatsapp"
                  required
                  defaultValue={produtor?.whatsapp ?? profile.phone ?? ""}
                  validateOnBlur
                />
                <p className="text-xs text-milsaca-verde-claro/80">
                  É por aqui que a corretora vai falar com você.
                </p>
              </div>
            </div>
          </section>

          {/* Opcional: dá pra pular tudo e completar depois */}
          <section className="rounded-2xl border border-milsaca-cream-escuro bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-milsaca-verde">
                Sua fazenda
              </h2>
              <span className="rounded-full bg-milsaca-cream-escuro/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-milsaca-verde-claro">
                Opcional
              </span>
            </div>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="state">Estado</Label>
                  <UfSelect
                    id="state"
                    name="state"
                    defaultValue={produtor?.state ?? "MG"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">Cidade</Label>
                  <MunicipioAutocomplete
                    name="city"
                    defaultValue={produtor?.city ?? ""}
                    uf={produtor?.state ?? "MG"}
                    ufFieldId="state"
                    placeholder="Toque para escolher"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="specie">O que você produz</Label>
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
                <div className="space-y-1.5">
                  <Label htmlFor="cpf_cnpj">CPF ou CNPJ</Label>
                  <MaskedInput
                    id="cpf_cnpj"
                    type="cpf-cnpj"
                    name="cpf_cnpj"
                    defaultValue={produtor?.cpf_cnpj ?? ""}
                    validateOnBlur
                  />
                  <p className="text-xs text-milsaca-verde-claro/80">
                    Só pra fechar contrato — pode deixar pra depois.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <SubmitButton
            size="lg"
            pendingLabel="Salvando..."
            className="w-full bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
          >
            Começar
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
