import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { resetPassword } from "./_actions";
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

type SearchParams = Promise<{ error?: string }>;

export const metadata = { title: "Redefinir senha — Milsaca" };

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  // Sessão temporária criada pelo /auth/callback após click no link
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      "/esqueci-senha?error=Link%20expirado%20ou%20inv%C3%A1lido.%20Solicite%20de%20novo",
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-milsaca-cream px-5 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <MilsacaLogo size={160} priority />
        </div>

        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle className="text-h2">Redefinir senha</CardTitle>
            <CardDescription>
              Logada como{" "}
              <span className="font-medium text-milsaca-preto">
                {user.email}
              </span>
              . Escolha uma senha nova.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={resetPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar nova senha</Label>
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Repita a senha"
                />
              </div>

              {sp.error ? (
                <p
                  role="alert"
                  className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-body-sm font-medium text-danger-700"
                >
                  {sp.error}
                </p>
              ) : null}

              <SubmitButton
                pendingLabel="Salvando..."
                variant="primary"
                size="lg"
                className="w-full"
              >
                Salvar nova senha
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
