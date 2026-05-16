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
import { Button } from "@/components/ui/button";
import { createClient } from "@milsaca/db/web/server";
import { getProfile, getUser } from "@/lib/auth";
import { updatePerfilProdutor } from "./_actions";

export const metadata = { title: "Perfil — Painel do produtor" };

type SearchParams = Promise<{ error?: string; saved?: string }>;

type ProdutorExt = {
  fazenda_nome: string | null;
  city: string | null;
  state: string | null;
  area_ha: number | null;
  altitude_m: number | null;
};

async function loadProdutorExt(profileId: string): Promise<ProdutorExt | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("produtores")
    .select("fazenda_nome, city, state, area_ha, altitude_m")
    .eq("profile_id", profileId)
    .maybeSingle<ProdutorExt>();
  return data ?? null;
}

export default async function PerfilProdutorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  if (!user || !profile) redirect("/entrar");
  const sp = await searchParams;
  const ext = await loadProdutorExt(user.id);

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
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                placeholder="(33) 99999-9999"
                defaultValue={profile.phone ?? ""}
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
              <Input
                id="state"
                name="state"
                maxLength={2}
                placeholder="MG"
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
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
          >
            Salvar perfil
          </Button>
        </div>
      </form>
    </div>
  );
}
