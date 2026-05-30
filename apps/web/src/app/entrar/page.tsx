import Link from "next/link";
import { signIn } from "./_actions";
import { SubmitButton } from "@/components/submit-button";
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
    <main className="flex min-h-screen items-center justify-center bg-milsaca-cream px-5 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <MilsacaLogo size={160} priority />
        </div>

        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle className="text-h2">Entrar</CardTitle>
            <CardDescription>
              Acesse com email e senha. Primeira vez? Crie sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signIn} className="space-y-5">
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
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="password">Senha</Label>
                  <Link
                    href="/esqueci-senha"
                    className="text-caption font-medium text-milsaca-dourado-texto hover:underline"
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
                <p
                  role="status"
                  className="rounded-md border border-success-100 bg-success-50 px-3 py-2 text-body-sm text-success-700"
                >
                  {sp.ok}
                </p>
              ) : null}
              {sp.error ? (
                <p
                  role="alert"
                  className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-body-sm font-medium text-danger-700"
                >
                  {sp.error}
                </p>
              ) : null}

              <SubmitButton
                pendingLabel="Entrando..."
                variant="primary"
                size="lg"
                className="w-full"
              >
                Entrar
              </SubmitButton>
            </form>

            <p className="mt-6 text-center text-body-sm text-neutral-600">
              Não tem conta?{" "}
              <Link
                href="/cadastrar"
                className="font-semibold text-milsaca-cafezal hover:underline"
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
