import Link from "next/link";
import { requestPasswordReset } from "./_actions";
import { Button } from "@/components/ui/button";
import { MilsacaLogo } from "@/components/milsaca-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SearchParams = Promise<{ error?: string; ok?: string; email?: string }>;

export const metadata = { title: "Esqueci minha senha — Milsaca" };

export default async function EsqueciSenhaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-milsaca-cream px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <MilsacaLogo size={160} priority />
        </div>

        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-2xl">Esqueci minha senha</CardTitle>
            <CardDescription>
              Informe seu email. Mandamos um link pra você criar uma nova senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={requestPasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  defaultValue={sp.email ?? ""}
                  placeholder="voce@exemplo.com"
                />
              </div>

              {sp.ok ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {sp.ok}
                </p>
              ) : null}
              {sp.error ? (
                <p className="text-sm text-destructive">{sp.error}</p>
              ) : null}

              <Button
                type="submit"
                className="w-full bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
              >
                Enviar link
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-milsaca-verde-claro">
              <Link
                href="/entrar"
                className="font-medium text-milsaca-verde hover:underline"
              >
                ← Voltar pro login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
