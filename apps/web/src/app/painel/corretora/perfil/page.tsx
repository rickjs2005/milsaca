import { getProfile, getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Perfil — Painel da corretora" };

type CorretoraResumo = {
  name: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
};

async function loadCorretora(
  corretoraId: string | null,
): Promise<CorretoraResumo | null> {
  if (!corretoraId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("corretoras")
    .select("name, city, state, phone, email")
    .eq("id", corretoraId)
    .maybeSingle<CorretoraResumo>();
  return data ?? null;
}

export default async function PerfilCorretoraPage() {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  if (!user || !profile) redirect("/entrar");
  const corretora = await loadCorretora(profile.corretora_id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Perfil
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Seus dados e os da corretora.
        </p>
      </header>

      <Card className="border-milsaca-cream-escuro">
        <CardHeader>
          <CardTitle className="text-base">Operador</CardTitle>
          <CardDescription>Quem está usando esta conta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Field label="Nome" value={profile.full_name ?? "—"} />
          <Field label="Email" value={user.email ?? "—"} />
          <Field label="Telefone" value={profile.phone ?? "—"} />
          <Field label="Tipo de conta" value={profile.role} />
        </CardContent>
      </Card>

      <Card className="border-milsaca-cream-escuro">
        <CardHeader>
          <CardTitle className="text-base">Corretora</CardTitle>
          <CardDescription>Dados cadastrais da empresa.</CardDescription>
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
