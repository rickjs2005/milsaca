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
    <main className="flex min-h-screen items-center justify-center bg-milsaca-cream px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <MilsacaLogo size={140} priority />
        </div>

        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-dourado/15 text-milsaca-dourado">
              <Mail className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Confirme seu email</CardTitle>
            <CardDescription>
              Enviamos um código de 6 dígitos pra{" "}
              <strong className="text-milsaca-verde">{email}</strong>.
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
                  className="text-center text-2xl tracking-widest font-mono"
                />
                <p className="text-[11px] text-milsaca-verde-claro/80">
                  O código expira em 1 hora. Cheque também o spam.
                </p>
              </div>

              {sp.error ? (
                <p
                  role="alert"
                  className="text-sm font-medium text-destructive"
                >
                  {sp.error}
                </p>
              ) : null}
              {sp.ok ? (
                <p className="text-sm font-medium text-emerald-700">
                  {sp.ok}
                </p>
              ) : null}

              <SubmitButton
                pendingLabel="Confirmando..."
                className="w-full bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
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
                className="w-full"
              >
                Reenviar código
              </SubmitButton>
            </form>

            <p className="mt-6 text-center text-xs text-milsaca-verde-claro">
              Email errado?{" "}
              <Link
                href="/cadastrar"
                className="font-medium text-milsaca-verde hover:underline"
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
