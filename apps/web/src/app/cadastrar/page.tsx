import Link from "next/link";
import { Coffee } from "lucide-react";
import { signUp } from "./_actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CadastroForm } from "./_components/cadastro-form";

type SearchParams = Promise<{
  email?: string;
  full_name?: string;
  role?: string;
  corretora_name?: string;
  corretora_city?: string;
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-milsaca-cream px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-milsaca-verde text-milsaca-dourado">
            <Coffee className="h-5 w-5" />
          </span>
          <span className="text-xl font-semibold tracking-tight text-milsaca-verde">
            Milsaca
          </span>
        </div>

        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-2xl">Criar conta</CardTitle>
            <CardDescription>
              Você é produtor ou está abrindo uma corretora?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CadastroForm
              action={signUp}
              initialRole={initialRole}
              defaults={{
                email: sp.email ?? "",
                full_name: sp.full_name ?? "",
                corretora_name: sp.corretora_name ?? "",
                corretora_city: sp.corretora_city ?? "",
              }}
              error={sp.error ?? null}
            />

            <p className="mt-6 text-center text-sm text-milsaca-verde-claro">
              Já tem conta?{" "}
              <Link
                href="/entrar"
                className="font-medium text-milsaca-verde hover:underline"
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
