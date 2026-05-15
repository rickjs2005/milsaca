import Link from "next/link";
import { redirect } from "next/navigation";
import { Coffee, Mail } from "lucide-react";
import { verifyCode } from "../_actions";
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
  redirectTo?: string;
  error?: string;
}>;

export default async function VerificarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  if (!sp.email) redirect("/entrar");

  const email = sp.email;
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
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-cream-escuro text-milsaca-verde">
              <Mail className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Confira seu email</CardTitle>
            <CardDescription>
              Enviamos um código de 6 dígitos para{" "}
              <span className="font-medium text-milsaca-verde">{email}</span>.
              Cole abaixo para entrar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={verifyCode} className="space-y-4">
              <input type="hidden" name="email" value={email} />
              {sp.redirectTo && (
                <input
                  type="hidden"
                  name="redirectTo"
                  value={sp.redirectTo}
                />
              )}
              <div className="space-y-2">
                <Label htmlFor="token">Código de 6 dígitos</Label>
                <Input
                  id="token"
                  name="token"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="123456"
                  className="text-center text-2xl tracking-[0.5em] font-mono"
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
          Não recebeu?{" "}
          <Link
            href="/entrar"
            className="font-medium text-milsaca-verde underline-offset-4 hover:underline"
          >
            Pedir outro código
          </Link>
        </p>
      </div>
    </main>
  );
}
