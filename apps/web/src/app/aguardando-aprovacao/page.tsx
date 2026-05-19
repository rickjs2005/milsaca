import Link from "next/link";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MilsacaLogo } from "@/components/milsaca-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Aguardando aprovação — Milsaca" };

type SearchParams = Promise<{ email?: string }>;

export default async function AguardandoAprovacaoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-milsaca-cream px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <MilsacaLogo size={140} />
        </div>

        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-dourado/20 text-milsaca-dourado">
              <Clock className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Cadastro em análise</CardTitle>
            <CardDescription>
              {sp.email
                ? `Sua corretora (${sp.email}) está aguardando aprovação.`
                : "Sua corretora está aguardando aprovação."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-milsaca-verde-claro">
            <p>
              Um administrador do Milsaca vai validar os dados da sua corretora
              em até 24h e liberar o acesso. Você recebe um email assim que for
              aprovada.
            </p>
            <p>
              Enquanto isso, você pode salvar este link nos favoritos e voltar
              depois. Não precisa criar nada de novo.
            </p>

            <form action="/sair" method="post" className="pt-4">
              <Button
                type="submit"
                variant="outline"
                className="w-full text-milsaca-verde-claro"
              >
                Sair
              </Button>
            </form>

            <p className="text-center text-xs text-milsaca-verde-claro/70">
              Acha que houve erro?{" "}
              <Link
                href="/entrar"
                className="font-medium text-milsaca-verde hover:underline"
              >
                Voltar pro login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
