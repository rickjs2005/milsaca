import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { MilsacaLogo } from "@/components/milsaca-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { entrarNaEspera } from "./_actions";
import { WaitlistForm } from "./_components/waitlist-form";

type SearchParams = Promise<{
  name?: string;
  error?: string;
  enviado?: string;
}>;

export const metadata = {
  title: "Lista de espera — Milsaca",
  description:
    "Vagas de corretora fundadora encerradas no momento. Entre na lista de espera.",
};

export default async function EsperaCorretoraPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const enviado = sp.enviado === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-milsaca-cream px-6 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center justify-center">
          <MilsacaLogo size={160} priority />
        </div>

        <Card>
          {enviado ? (
            <CardContent className="space-y-4 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-600 ring-1 ring-inset ring-success-100">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="text-h2 text-milsaca-cafezal">Tá na lista!</h1>
              <p className="text-body-sm leading-relaxed text-neutral-600">
                Anotamos seu interesse. Assim que abrirmos novas vagas de
                corretora, a gente te chama no WhatsApp.
              </p>
              <Link
                href="/"
                className="inline-block text-body-sm font-medium text-milsaca-cafezal hover:underline"
              >
                Voltar pro início
              </Link>
            </CardContent>
          ) : (
            <>
              <CardHeader className="space-y-1.5 pb-2">
                <CardTitle className="text-h2 text-milsaca-cafezal">
                  Lista de espera de corretora
                </CardTitle>
                <CardDescription>
                  As vagas de fundadora (grátis vitalício) estão encerradas no
                  momento. Deixe seu contato que avisamos quando abrir.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <WaitlistForm
                  action={entrarNaEspera}
                  defaults={{ name: sp.name ?? "" }}
                  error={sp.error ?? null}
                />
                <p className="mt-6 text-center text-body-sm text-neutral-600">
                  É produtor?{" "}
                  <Link
                    href="/cadastrar"
                    className="font-medium text-milsaca-cafezal hover:underline"
                  >
                    Criar conta de produtor
                  </Link>
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
