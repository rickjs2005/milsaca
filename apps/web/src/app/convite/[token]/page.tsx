import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, MailCheck } from "lucide-react";
import { createClient } from "@milsaca/db/web/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MilsacaLogo } from "@/components/milsaca-logo";
import { SubmitButton } from "@/components/submit-button";
import { aceitarConvite } from "./_actions";

export const metadata = { title: "Aceitar convite — Milsaca" };

type SearchParams = Promise<{
  email?: string;
  full_name?: string;
  error?: string;
}>;

interface InviteRow {
  token: string;
  corretora_id: string;
  corretora_name: string;
  corretora_slug: string;
  email: string | null;
  expires_at: string;
  is_valid: boolean;
  invalid_reason: string | null;
}

export default async function ConvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: SearchParams;
}) {
  const { token } = await params;
  const sp = await searchParams;

  if (!token || token.length < 30) redirect("/convite/invalido");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_corretora_invite", {
    invite_token: token,
  });

  if (error || !data || data.length === 0) {
    redirect("/convite/invalido");
  }

  const invite = (data as InviteRow[])[0];
  if (!invite) redirect("/convite/invalido");
  if (!invite.is_valid) {
    redirect(
      `/convite/invalido?reason=${invite.invalid_reason ?? "expired"}&corretora=${encodeURIComponent(invite.corretora_name)}`,
    );
  }

  const expiresAt = new Date(invite.expires_at);
  const daysLeft = Math.ceil(
    (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-milsaca-cream px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <MilsacaLogo size={160} priority />
        </div>

        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-milsaca-dourado">
              <ShieldCheck className="h-3.5 w-3.5" />
              Convite válido
            </div>
            <CardTitle className="text-2xl">Bem-vindo(a)!</CardTitle>
            <CardDescription>
              Você foi convidado pra operar a corretora{" "}
              <strong>{invite.corretora_name}</strong> no Milsaca.
              Crie sua conta abaixo pra começar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={aceitarConvite} className="space-y-4">
              <input type="hidden" name="token" value={invite.token} />

              <div className="space-y-2">
                <Label htmlFor="full_name">Seu nome completo</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  autoComplete="name"
                  defaultValue={sp.full_name ?? ""}
                  placeholder="Nome do dono da corretora"
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
                  defaultValue={sp.email ?? invite.email ?? ""}
                  readOnly={!!invite.email}
                  placeholder="seu@email.com"
                />
                {invite.email ? (
                  <p className="text-[11px] text-slate-500">
                    Email definido pelo admin que enviou o convite.
                  </p>
                ) : null}
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
                />
              </div>

              {sp.error ? (
                <p
                  role="alert"
                  className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700"
                >
                  {sp.error}
                </p>
              ) : null}

              <SubmitButton
                className="w-full bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
                pendingLabel="Criando conta..."
              >
                Criar conta e entrar
              </SubmitButton>

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <MailCheck className="h-3 w-3" />
                Convite expira em {daysLeft} dia{daysLeft === 1 ? "" : "s"}
              </p>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              Já tem conta?{" "}
              <Link href="/entrar" className="text-milsaca-cafezal underline">
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
