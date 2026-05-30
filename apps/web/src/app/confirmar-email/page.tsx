import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { MilsacaLogo } from "@/components/milsaca-logo";
import { confirmEmail, resendConfirmation } from "./_actions";

export const metadata = { title: "Confirmar email — Milsaca" };

type SearchParams = Promise<{
  email?: string;
  error?: string;
  ok?: string;
  corretora?: string;
}>;

export default async function ConfirmarEmailPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const email = sp.email?.trim().toLowerCase() ?? "";

  // Sem email no query, não tem como confirmar — manda pro signup
  if (!email) {
    redirect("/cadastrar?error=Acesse%20%2Fconfirmar-email%20depois%20do%20cadastro");
  }

  const isCorretora = sp.corretora === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-milsaca-cream px-5 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <MilsacaLogo size={140} priority />
        </div>

        <Card className="shadow-elevated">
          <CardHeader>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-cafezal/10 text-milsaca-cafezal">
              <Mail className="h-6 w-6" />
            </div>
            <CardTitle className="text-h2">Confirme seu email</CardTitle>
            <CardDescription>
              Enviamos um código de 6 dígitos pra{" "}
              <strong className="text-milsaca-preto">{email}</strong>.
              Digite abaixo pra ativar a conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={confirmEmail} className="space-y-4">
              <input type="hidden" name="email" value={email} />
              {isCorretora ? (
                <input type="hidden" name="corretora" value="1" />
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="token">Código</Label>
                <Input
                  id="token"
                  name="token"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  autoFocus
                  required
                  placeholder="000000"
                  autoComplete="one-time-code"
                  className="text-center text-2xl tracking-[0.4em] font-mono"
                />
                <p className="text-caption text-neutral-500">
                  O código expira em 1 hora. Cheque também o spam.
                </p>
              </div>

              {sp.error ? (
                <p
                  role="alert"
                  className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-body-sm font-medium text-danger-700"
                >
                  {sp.error}
                </p>
              ) : null}
              {sp.ok ? (
                <p
                  role="status"
                  className="rounded-md border border-success-100 bg-success-50 px-3 py-2 text-body-sm font-medium text-success-700"
                >
                  {sp.ok}
                </p>
              ) : null}

              <SubmitButton
                pendingLabel="Confirmando..."
                variant="primary"
                size="lg"
                className="w-full"
              >
                Confirmar
              </SubmitButton>
            </form>

            <form action={resendConfirmation} className="mt-4">
              <input type="hidden" name="email" value={email} />
              {isCorretora ? (
                <input type="hidden" name="corretora" value="1" />
              ) : null}
              <SubmitButton
                pendingLabel="Reenviando..."
                variant="outline"
                size="lg"
                className="w-full"
              >
                Reenviar código
              </SubmitButton>
            </form>

            <p className="mt-6 text-center text-caption text-neutral-600">
              Email errado?{" "}
              <Link
                href="/cadastrar"
                className="font-semibold text-milsaca-cafezal hover:underline"
              >
                Voltar pro cadastro
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
