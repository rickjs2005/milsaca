import Link from "next/link";
import { signIn } from "./_actions";
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

type SearchParams = Promise<{
  redirectTo?: string;
  email?: string;
  error?: string;
  ok?: string;
}>;

export const metadata = { title: "Entrar — Milsaca" };

export default async function EntrarPage({
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
            <CardTitle className="text-2xl">Entrar</CardTitle>
            <CardDescription>
              Acesse com email e senha. Primeira vez? Crie sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signIn} className="space-y-4">
              {sp.redirectTo && (
                <input
                  type="hidden"
                  name="redirectTo"
                  value={sp.redirectTo}
                />
              )}

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

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Link
                    href="/esqueci-senha"
                    className="text-xs text-milsaca-dourado hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
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
                Entrar
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-milsaca-verde-claro">
              Não tem conta?{" "}
              <Link
                href="/cadastrar"
                className="font-medium text-milsaca-verde hover:underline"
              >
                Criar conta
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
