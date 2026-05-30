import Link from "next/link";
import { signUp } from "./_actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CadastroForm } from "./_components/cadastro-form";
import { MilsacaLogo } from "@/components/milsaca-logo";
import { getFounderProgramStatus } from "@/lib/founder-program";

type SearchParams = Promise<{
  email?: string;
  full_name?: string;
  role?: string;
  corretora_name?: string;
  corretora_city?: string;
  corretora_uf?: string;
  corretora_whatsapp?: string;
  error?: string;
}>;

export const metadata = { title: "Criar conta — Milsaca" };

export default async function CadastrarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const initialRole = sp.role === "corretora" ? "corretora" : "produtor";
  const founder = await getFounderProgramStatus();

  return (
    <main className="flex min-h-screen items-center justify-center bg-milsaca-cream px-5 py-10 sm:px-6">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-center">
          <MilsacaLogo size={160} priority />
        </div>

        <Card className="shadow-elevated">
          <CardHeader className="space-y-1.5 pb-2">
            <CardTitle className="text-h2">Criar conta</CardTitle>
            <CardDescription>
              Você é produtor ou está abrindo uma corretora?
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <CadastroForm
              action={signUp}
              initialRole={initialRole}
              defaults={{
                email: sp.email ?? "",
                full_name: sp.full_name ?? "",
                corretora_name: sp.corretora_name ?? "",
                corretora_cnpj: "",
                corretora_city: sp.corretora_city ?? "",
                corretora_uf: sp.corretora_uf ?? "",
                corretora_whatsapp: sp.corretora_whatsapp ?? "",
              }}
              founder={{
                accepting: founder.accepting,
                used: founder.used,
                total: founder.total,
              }}
              error={sp.error ?? null}
            />

            <p className="mt-4 text-center text-caption text-neutral-600">
              Ao criar conta, você concorda com os{" "}
              <Link
                href="/termos"
                className="font-medium text-milsaca-cafezal hover:underline"
              >
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link
                href="/politica-privacidade"
                className="font-medium text-milsaca-cafezal hover:underline"
              >
                Política de Privacidade
              </Link>
              .
            </p>

            <p className="mt-6 text-center text-body-sm text-neutral-600">
              Já tem conta?{" "}
              <Link
                href="/entrar"
                className="font-semibold text-milsaca-cafezal hover:underline"
              >
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
