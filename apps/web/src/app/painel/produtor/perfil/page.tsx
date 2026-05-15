import { getProfile, getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Perfil — Painel do produtor" };

export default async function PerfilPage() {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  if (!user || !profile) redirect("/entrar");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Perfil
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Seus dados cadastrais.
        </p>
      </header>

      <Card className="border-milsaca-cream-escuro">
        <CardHeader>
          <CardTitle className="text-base">Dados básicos</CardTitle>
          <CardDescription>
            Em breve será possível editar diretamente pelo painel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Field label="Nome" value={profile.full_name ?? "—"} />
          <Field label="Email" value={user.email ?? "—"} />
          <Field label="Telefone" value={profile.phone ?? "—"} />
          <Field label="Tipo de conta" value={profile.role} />
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
