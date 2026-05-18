import Link from "next/link";
import { Coffee } from "lucide-react";
import { signUp } from "./_actions";
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

type SearchParams = Promise<{
  email?: string;
  full_name?: string;
  error?: string;
}>;

export const metadata = { title: "Criar conta — Milsaca" };

export default async function CadastrarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

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
            <CardTitle className="text-2xl">Criar conta</CardTitle>
            <CardDescription>
              Comece como produtor. Sua corretora pode te vincular depois.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Seu nome completo</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  autoComplete="name"
                  defaultValue={sp.full_name ?? ""}
                  placeholder="João da Silva"
                />
              </div>

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
                <Label htmlFor="password">Senha</Label>
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
                <Label htmlFor="confirm">Confirmar senha</Label>
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

              <Button
                type="submit"
                className="w-full bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
              >
                Criar conta
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-milsaca-verde-claro">
              Já tem conta?{" "}
              <Link
                href="/entrar"
                className="font-medium text-milsaca-verde hover:underline"
              >
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
