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
    <main className="flex min-h-screen items-center justify-center bg-milsaca-cream px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <MilsacaLogo size={160} priority />
        </div>

        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-2xl">Redefinir senha</CardTitle>
            <CardDescription>
              Logada como{" "}
              <span className="font-medium text-milsaca-verde">
                {user.email}
              </span>
              . Escolha uma senha nova.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={resetPassword} className="space-y-4">
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
                <p className="text-sm text-destructive">{sp.error}</p>
              ) : null}

              <SubmitButton
                pendingLabel="Salvando..."
                className="w-full bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
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
