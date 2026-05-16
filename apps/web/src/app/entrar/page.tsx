import { Coffee, Sparkles } from "lucide-react";
import { sendCode } from "./_actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SearchParams = Promise<{ redirectTo?: string; error?: string }>;

export const metadata = { title: "Entrar — Milsaca" };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const error = sp.error;

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
            <CardTitle className="text-2xl">Entrar ou criar conta</CardTitle>
            <CardDescription>
              Vamos enviar um código de 6 dígitos pro seu email. Sem senha.
              Primeiro acesso? A conta é criada automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={sendCode} className="space-y-4">
              {sp.redirectTo && (
                <input
                  type="hidden"
                  name="redirectTo"
                  value={sp.redirectTo}
                />
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Seu email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name" className="flex items-center gap-1">
                  Seu nome
                  <span className="text-xs font-normal text-milsaca-verde-claro">
                    (só no primeiro acesso)
                  </span>
                </Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  autoComplete="name"
                  placeholder="Como podemos te chamar?"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                type="submit"
                className="w-full bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
              >
                Enviar código
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 flex items-start gap-2 rounded-md border border-milsaca-dourado/30 bg-milsaca-dourado/5 p-3 text-xs text-milsaca-verde">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-milsaca-dourado" />
          <p>
            Funciona pra produtor e corretora — o mesmo email entra em ambos
            os papéis. Quando você tiver 2 papéis, vai poder alternar pelo
            menu lateral.
          </p>
        </div>
      </div>
    </main>
  );
}
