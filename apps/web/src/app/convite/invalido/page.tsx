import Link from "next/link";
import { AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MilsacaLogo } from "@/components/milsaca-logo";

export const metadata = { title: "Convite inválido — Milsaca" };

type SearchParams = Promise<{ reason?: string; corretora?: string }>;

const REASON_LABEL: Record<string, string> = {
  used: "Este link já foi usado.",
  expired: "Este link expirou.",
  corretora_removed: "A corretora deste convite foi removida.",
  consume_failed: "Não foi possível usar este convite. Fale com o admin.",
};

export default async function ConviteInvalidoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const reason = sp.reason ?? "expired";
  const reasonLabel = REASON_LABEL[reason] ?? "Convite inválido ou expirado.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-milsaca-cream px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <MilsacaLogo size={160} priority />
        </div>

        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-rose-700">
              <AlertCircle className="h-3.5 w-3.5" />
              Convite inválido
            </div>
            <CardTitle className="text-2xl">Não foi possível continuar</CardTitle>
            <CardDescription>
              {reasonLabel}{" "}
              {sp.corretora ? (
                <>
                  Peça pro admin gerar um novo link de convite pra{" "}
                  <strong>{sp.corretora}</strong>.
                </>
              ) : (
                "Peça pro admin gerar um novo link de convite."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href="/entrar">Entrar com conta existente</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Voltar ao início</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
