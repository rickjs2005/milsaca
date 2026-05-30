import Link from "next/link";
import { requestPasswordReset } from "./_actions";
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

type SearchParams = Promise<{ error?: string; ok?: string; email?: string }>;

export const metadata = { title: "Esqueci minha senha — Milsaca" };

export default async function EsqueciSenhaPage({
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
            <CardTitle className="text-h2">Esqueci minha senha</CardTitle>
            <CardDescription>
              Informe seu email. Mandamos um link pra você criar uma nova senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={requestPasswordReset} className="space-y-5">
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
                pendingLabel="Enviando..."
                variant="primary"
                size="lg"
                className="w-full"
              >
                Enviar link
              </SubmitButton>
            </form>

            <p className="mt-6 text-center text-body-sm text-neutral-600">
              <Link
                href="/entrar"
                className="font-semibold text-milsaca-cafezal hover:underline"
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
