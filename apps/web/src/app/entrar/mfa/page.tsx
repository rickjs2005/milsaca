import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
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
import { SubmitButton } from "@/components/submit-button";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@milsaca/db/web/server";
import { verifyMfa } from "../_actions";

export const metadata = { title: "Código de verificação — Milsaca" };

type SearchParams = Promise<{ error?: string; redirectTo?: string }>;

export default async function MfaChallengePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = (factors?.totp ?? []).find((f) => f.status === "verified");

  // Se chegou aqui sem fator (AAL1 já é o nível final), volta pra home
  // do destino normal — provavelmente um bot ou bookmark velho.
  if (!verified) {
    redirect(sp.redirectTo || "/painel");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-milsaca-cream px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <MilsacaLogo size={140} />
        </div>

        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-dourado/15 text-milsaca-dourado">
              <Shield className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Código de verificação</CardTitle>
            <CardDescription>
              Digite o código de 6 dígitos do seu app autenticador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={verifyMfa} className="space-y-4">
              <input type="hidden" name="factor_id" value={verified.id} />
              {sp.redirectTo ? (
                <input
                  type="hidden"
                  name="redirectTo"
                  value={sp.redirectTo}
                />
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  name="code"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  required
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest font-mono"
                  pattern="[0-9]{6}"
                />
              </div>

              {sp.error ? (
                <p className="text-sm text-destructive">{sp.error}</p>
              ) : null}

              <SubmitButton
                pendingLabel="Verificando..."
                className="w-full bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
              >
                Confirmar
              </SubmitButton>
            </form>

            <p className="mt-6 text-center text-xs text-milsaca-verde-claro">
              <SignOutButton className="font-medium hover:text-milsaca-verde hover:underline">
                Cancelar e sair
              </SignOutButton>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
