import Link from "next/link";
import { Coffee } from "lucide-react";
import { signInCorretora } from "../_actions";
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

export default async function EntrarCorretoraPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const error = sp.error;

  return (
    <main className="flex min-h-screen items-center justify-center bg-milsaca-cream px-6">
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
            <CardTitle className="text-2xl">Acesso da corretora</CardTitle>
            <CardDescription>
              Use seu email corporativo e senha cadastrada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signInCorretora} className="space-y-4">
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
                  placeholder="voce@suacorretora.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                className="w-full bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
              >
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-milsaca-verde-claro">
          É produtor?{" "}
          <Link
            href="/entrar"
            className="font-medium text-milsaca-verde underline-offset-4 hover:underline"
          >
            Receber link mágico por email
          </Link>
        </p>
      </div>
    </main>
  );
}
