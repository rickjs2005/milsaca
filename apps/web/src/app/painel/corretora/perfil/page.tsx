import { redirect } from "next/navigation";
import { CheckCircle2, Info } from "lucide-react";
import { getProfile, getUser } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
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
import { updatePerfilCorretora } from "./_actions";

export const metadata = { title: "Perfil — Painel da corretora" };

type SearchParams = Promise<{ error?: string; saved?: string }>;

type CorretoraResumo = {
  name: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  verified: boolean;
};

async function loadCorretora(
  corretoraId: string | null,
): Promise<CorretoraResumo | null> {
  if (!corretoraId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("corretoras")
    .select("name, city, state, phone, email, verified")
    .eq("id", corretoraId)
    .maybeSingle<CorretoraResumo>();
  return data ?? null;
}

export default async function PerfilCorretoraPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  if (!user || !profile) redirect("/entrar");
  const sp = await searchParams;
  const corretora = await loadCorretora(profile.corretora_id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Perfil
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Seus dados de operador. Mudanças na corretora exigem administrador.
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

      <form action={updatePerfilCorretora}>
        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-base">Dados do operador</CardTitle>
            <CardDescription>
              Quem está logado nesta sessão.
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

            <div className="flex justify-end sm:col-span-2">
              <Button
                type="submit"
                className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
              >
                Salvar dados pessoais
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card className="border-milsaca-cream-escuro">
        <CardHeader>
          <CardTitle className="text-base">Corretora</CardTitle>
          <CardDescription>
            Dados cadastrais da empresa — somente leitura.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {corretora ? (
            <>
              <Field label="Nome" value={corretora.name} />
              <Field
                label="Cidade / UF"
                value={
                  corretora.city
                    ? `${corretora.city} / ${corretora.state ?? "—"}`
                    : "—"
                }
              />
              <Field label="Telefone" value={corretora.phone ?? "—"} />
              <Field label="Email" value={corretora.email ?? "—"} />
              <Field
                label="Verificada"
                value={corretora.verified ? "Sim" : "Não"}
              />
              <div className="flex items-start gap-2 rounded-md border border-milsaca-dourado/30 bg-milsaca-dourado/5 p-3 text-xs text-milsaca-verde">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-milsaca-dourado" />
                <p>
                  Pra atualizar dados da corretora (nome, telefone, email),
                  fale com um administrador da Milsaca.
                </p>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">
              Você ainda não está vinculado a uma corretora. Fale com um
              administrador para concluir o cadastro.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-milsaca-verde-claro">{label}</span>
      <span className="font-medium text-milsaca-verde">{value}</span>
    </div>
  );
}
