import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaskedInput } from "@/components/forms/masked-input";
import { UfSelect } from "@/components/forms/uf-select";
import { SubmitButton } from "@/components/submit-button";
import { getProfile, getUser } from "@/lib/auth";
import {
  getProdutorByProfileId,
  SPECIE_LABEL,
  CANAL_LABEL,
} from "../_lib/produtor";
import { updatePerfilProdutor } from "./_actions";

export const metadata = { title: "Perfil — Painel do produtor" };

type SearchParams = Promise<{ error?: string; saved?: string }>;

export default async function PerfilProdutorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  if (!user || !profile) redirect("/entrar");
  const sp = await searchParams;
  const ext = await getProdutorByProfileId(user.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Perfil
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Mantenha seus dados atualizados pra a corretora chegar até você.
        </p>
      </header>

      {sp.saved && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          Perfil atualizado.
        </div>
      )}
      {sp.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {sp.error}
        </div>
      )}

      <form action={updatePerfilProdutor} className="space-y-6">
        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-base">Dados pessoais</CardTitle>
            <CardDescription>
              O email é o usado pra login e não pode ser alterado por aqui.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="full_name">Nome completo *</Label>
              <Input
                id="full_name"
                name="full_name"
                required
                defaultValue={profile.full_name ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label>Email (somente leitura)</Label>
              <Input value={user.email ?? ""} readOnly disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <MaskedInput
                id="phone"
                type="phone"
                name="phone"
                defaultValue={profile.phone ?? ""}
                validateOnBlur
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <MaskedInput
                id="whatsapp"
                type="phone"
                name="whatsapp"
                defaultValue={ext?.whatsapp ?? profile.phone ?? ""}
                validateOnBlur
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj">CPF / CNPJ</Label>
              <MaskedInput
                id="cpf_cnpj"
                type="cpf-cnpj"
                name="cpf_cnpj"
                defaultValue={ext?.cpf_cnpj ?? ""}
                validateOnBlur
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="caepf">CAEPF (opcional)</Label>
              <Input
                id="caepf"
                name="caepf"
                placeholder="Cadastro de Atividade Econômica do PF"
                defaultValue={ext?.caepf ?? ""}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-base">Fazenda</CardTitle>
            <CardDescription>
              Esses dados ajudam a corretora a calibrar propostas (talhão,
              altitude, volume).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fazenda_nome">Nome da fazenda</Label>
              <Input
                id="fazenda_nome"
                name="fazenda_nome"
                placeholder="Ex.: Sítio Boa Vista"
                defaultValue={ext?.fazenda_nome ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                name="city"
                placeholder="Manhuaçu"
                defaultValue={ext?.city ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">UF</Label>
              <UfSelect
                id="state"
                name="state"
                defaultValue={ext?.state ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area_ha">Área (hectares)</Label>
              <Input
                id="area_ha"
                name="area_ha"
                type="text"
                inputMode="decimal"
                placeholder="12,5"
                defaultValue={
                  ext?.area_ha != null
                    ? ext.area_ha.toLocaleString("pt-BR", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })
                    : ""
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="altitude_m">Altitude (metros)</Label>
              <Input
                id="altitude_m"
                name="altitude_m"
                type="number"
                step="1"
                min="0"
                placeholder="950"
                defaultValue={ext?.altitude_m ?? ""}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="specie">Espécie que produz</Label>
              <select
                id="specie"
                name="specie"
                defaultValue={ext?.specie ?? ""}
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

            <div className="space-y-2">
              <Label htmlFor="car">CAR (Cadastro Ambiental Rural)</Label>
              <Input
                id="car"
                name="car"
                placeholder="MG-3140100-..."
                defaultValue={ext?.car ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="indicacao_geografica">
                Indicação Geográfica
              </Label>
              <Input
                id="indicacao_geografica"
                name="indicacao_geografica"
                placeholder="Matas de Minas, Cerrado, Mantiqueira..."
                defaultValue={ext?.indicacao_geografica ?? ""}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="variedades">
                Variedades (separadas por vírgula)
              </Label>
              <Input
                id="variedades"
                name="variedades"
                placeholder="Catuaí Vermelho, Mundo Novo, Bourbon Amarelo"
                defaultValue={(ext?.variedades ?? []).join(", ")}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="certificacoes">
                Certificações (separadas por vírgula)
              </Label>
              <Input
                id="certificacoes"
                name="certificacoes"
                placeholder="Rainforest Alliance, UTZ, Fair Trade..."
                defaultValue={(ext?.certificacoes ?? []).join(", ")}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-base">Preferências</CardTitle>
            <CardDescription>
              Como você quer que a corretora entre em contato e que tipo de
              alerta receber.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="preco_alvo">Preço-alvo (R$/saca)</Label>
              <Input
                id="preco_alvo"
                name="preco_alvo"
                type="text"
                inputMode="decimal"
                placeholder="1.500,00"
                defaultValue={
                  ext?.preco_alvo != null
                    ? ext.preco_alvo.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : ""
                }
              />
              <p className="text-xs text-milsaca-verde-claro">
                Avisamos quando a cotação atingir esse valor.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="canal_preferido">Canal preferido</Label>
              <select
                id="canal_preferido"
                name="canal_preferido"
                defaultValue={ext?.canal_preferido ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">—</option>
                {Object.entries(CANAL_LABEL).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-milsaca-verde-claro sm:col-span-2">
              <input
                type="checkbox"
                name="receber_cotacao_diaria"
                defaultChecked={ext?.receber_cotacao_diaria ?? true}
              />
              Receber cotação do dia
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <SubmitButton
            pendingLabel="Salvando..."
            className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
          >
            Salvar perfil
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
