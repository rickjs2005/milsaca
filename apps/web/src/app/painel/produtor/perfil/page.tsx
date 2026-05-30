import { redirect } from "next/navigation";
import { CheckCircle2, Download, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
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
        <h1 className="text-h1 text-milsaca-cafezal">Perfil</h1>
        <p className="mt-1 text-body-sm text-neutral-600">
          Mantenha seus dados atualizados pra a corretora chegar até você.
        </p>
      </header>

      {sp.saved && (
        <div className="flex items-center gap-2 rounded-md border border-success-100 bg-success-50 px-4 py-2 text-body-sm text-success-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Perfil atualizado.
        </div>
      )}
      {sp.error && (
        <div className="rounded-md border border-danger-100 bg-danger-50 px-4 py-2 text-body-sm text-danger-700">
          {sp.error}
        </div>
      )}

      <form action={updatePerfilProdutor} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados pessoais</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Fazenda</CardTitle>
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
              <Select id="specie" name="specie" defaultValue={ext?.specie ?? ""}>
                <option value="">—</option>
                {Object.entries(SPECIE_LABEL).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </Select>
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

        <Card>
          <CardHeader>
            <CardTitle>Preferências</CardTitle>
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
              <p className="text-caption text-neutral-600">
                Avisamos quando a cotação atingir esse valor.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="canal_preferido">Canal preferido</Label>
              <Select
                id="canal_preferido"
                name="canal_preferido"
                defaultValue={ext?.canal_preferido ?? ""}
              >
                <option value="">—</option>
                {Object.entries(CANAL_LABEL).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            <label className="flex items-center gap-2 text-body-sm text-neutral-700 sm:col-span-2">
              <input
                type="checkbox"
                name="receber_cotacao_diaria"
                defaultChecked={ext?.receber_cotacao_diaria ?? true}
                className="h-4 w-4 rounded border-neutral-300 text-milsaca-cafezal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              Receber cotação do dia
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <SubmitButton pendingLabel="Salvando..." variant="primary">
            Salvar perfil
          </SubmitButton>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-milsaca-cafezal" />
            Privacidade (LGPD)
          </CardTitle>
          <CardDescription>
            Você pode baixar uma cópia de todos os dados que guardamos sobre
            você (perfil, fazenda, preferências) em formato JSON.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/api/lgpd/exportar"
            download
            className={buttonVariants({ variant: "outline" })}
          >
            <Download className="h-4 w-4" />
            Exportar meus dados
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
