import { redirect } from "next/navigation";
import { Handshake, Sprout, ArrowRight, AlertCircle } from "lucide-react";
import { getProfile, panelFor } from "@/lib/auth";
import { selectRole } from "./_actions";
import { Card, CardContent } from "@/components/ui/card";
import { MilsacaLogo } from "@/components/milsaca-logo";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata = { title: "Escolha o painel — Milsaca" };

type ClientRole = "produtor" | "corretora";

const ROLE_META: Record<
  ClientRole,
  {
    label: string;
    description: string;
    icon: typeof Handshake;
  }
> = {
  produtor: {
    label: "Entrar como produtor",
    description:
      "Acompanhe cotações, propostas e contratos das corretoras que falam com você.",
    icon: Sprout,
  },
  corretora: {
    label: "Entrar como corretora",
    description:
      "Veja leads, contratos e gerencie sua carteira de produtores.",
    icon: Handshake,
  },
};

export default async function EscolherPainelPage() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const clientRoles = profile.roles.filter(
    (r): r is ClientRole => r === "produtor" || r === "corretora",
  );

  if (clientRoles.length === 1) {
    redirect(panelFor(clientRoles[0]!));
  }

  // Estado degenerado: user logado sem nenhum papel cliente. Pode
  // acontecer se trigger handle_new_user falhou em popular roles, ou
  // se admin removeu manualmente. Em vez de jogar pra landing pública
  // (perde contexto), mostra mensagem honesta + Sair.
  if (clientRoles.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-milsaca-cream px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <MilsacaLogo size={120} />
          </div>
          <Card className="border-milsaca-cream-escuro">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <AlertCircle className="h-5 w-5" />
                </span>
                <div className="space-y-1">
                  <p className="font-semibold text-milsaca-verde">
                    Perfil sem painel disponível
                  </p>
                  <p className="text-sm text-milsaca-verde-claro">
                    Sua conta não tem papel de produtor nem corretora
                    vinculado. Saia e entre de novo — se persistir, fale com o
                    suporte (rickjanuario0@gmail.com).
                  </p>
                </div>
              </div>
              <SignOutButton className="w-full justify-center rounded-md bg-milsaca-verde px-4 py-2 text-sm font-medium text-milsaca-cream hover:bg-milsaca-verde-claro">
                Sair
              </SignOutButton>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-milsaca-cream px-6 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <MilsacaLogo size={120} className="mb-3" />
          <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
            Como você quer entrar hoje?
          </h1>
          <p className="mt-2 max-w-md text-sm text-milsaca-verde-claro">
            Sua conta tem mais de um papel. Escolha um painel — você pode
            trocar a qualquer momento pelo menu lateral.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {clientRoles.map((role) => {
            const meta = ROLE_META[role];
            const Icon = meta.icon;
            return (
              <form key={role} action={selectRole}>
                <input type="hidden" name="role" value={role} />
                <button
                  type="submit"
                  className="block w-full text-left"
                  aria-label={meta.label}
                >
                  <Card className="border-milsaca-cream-escuro transition-shadow hover:shadow-md">
                    <CardContent className="flex flex-col gap-3 p-6">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="space-y-1">
                        <p className="font-semibold text-milsaca-verde">
                          {meta.label}
                        </p>
                        <p className="text-xs text-milsaca-verde-claro">
                          {meta.description}
                        </p>
                      </div>
                      <span className="mt-1 flex items-center gap-1 text-sm font-medium text-milsaca-verde">
                        Continuar
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </CardContent>
                  </Card>
                </button>
              </form>
            );
          })}
        </div>

        <form action="/sair" method="post" className="mt-8 text-center">
          <button
            type="submit"
            className="text-sm text-milsaca-verde-claro underline-offset-4 hover:text-milsaca-verde hover:underline"
          >
            Sair da conta
          </button>
        </form>
      </div>
    </main>
  );
}
