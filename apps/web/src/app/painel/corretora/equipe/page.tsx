import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  ShieldAlert,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import type { Database } from "@milsaca/types";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import { InviteLinkCard } from "@/app/admin/(panel)/corretoras/_components/invite-link-card";
import {
  getCorretoraSubscriptionInfo,
  requireCorretoraDono,
} from "../_lib/corretora";
import { isProOrAbove } from "../_lib/plan-gate";
import { LockedHint } from "../_components/locked-hint";
import {
  gerarConviteEquipe,
  revogarConviteEquipe,
  removerOperador,
} from "./_actions";

export const metadata = { title: "Equipe — Milsaca" };

type SearchParams = Promise<{
  error?: string;
  ok?: string;
  invite_token?: string;
}>;

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  pendente: "Pendente",
  bloqueado: "Bloqueado",
};

type Operador =
  Database["public"]["Functions"]["list_corretora_operadores"]["Returns"][number];
type ConviteEquipe =
  Database["public"]["Functions"]["list_convites_corretora_self"]["Returns"][number];

export default async function EquipePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  // Só o dono gerencia a equipe.
  requireCorretoraDono(profile);

  const sp = await searchParams;
  const supabase = await createClient();

  const [
    { data: operadores },
    { data: convites },
    { data: corretora },
    subscription,
  ] = await Promise.all([
    supabase.rpc("list_corretora_operadores"),
    supabase.rpc("list_convites_corretora_self"),
    supabase
      .from("corretoras")
      .select("name")
      .eq("id", profile.corretora_id)
      .maybeSingle(),
    getCorretoraSubscriptionInfo(profile.corretora_id),
  ]);

  const corretoraName = corretora?.name ?? "Sua corretora";
  const team: Operador[] = operadores ?? [];
  const invitesAtivos: ConviteEquipe[] = convites ?? [];
  // Gate por plano: Gratuito = só o dono; convidar operadores é do Premium.
  const podeConvidar = isProOrAbove(subscription);

  // URL absoluta do convite recém-gerado (?invite_token=X), reusando o
  // fluxo público /convite/[token].
  let newInviteUrl: string | null = null;
  if (sp.invite_token) {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host = h.get("host") ?? "milsaca.app";
    newInviteUrl = `${proto}://${host}/convite/${sp.invite_token}`;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-milsaca-verde/10 text-milsaca-verde">
          <Users className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-milsaca-verde">
            Equipe
          </h1>
          <p className="text-sm text-milsaca-verde-claro">
            Convide operadores pra trabalhar na {corretoraName}. Você é o{" "}
            <strong>dono</strong> (acesso total); o <strong>operador</strong>{" "}
            cuida da operação comercial, mas não acessa Pagamentos, Equipe nem
            Assinatura.
          </p>
        </div>
      </header>

      {sp.ok && (
        <div className="flex items-center gap-2 rounded-md border border-success-100 bg-success-50 px-4 py-2 text-sm text-success-700">
          <CheckCircle2 className="h-4 w-4" />
          {sp.ok}
        </div>
      )}
      {sp.error && (
        <div className="flex items-center gap-2 rounded-md border border-danger-100 bg-danger-50 px-4 py-2 text-sm text-danger-700">
          <ShieldAlert className="h-4 w-4" />
          {sp.error}
        </div>
      )}

      {newInviteUrl && (
        <InviteLinkCard inviteUrl={newInviteUrl} corretoraName={corretoraName} />
      )}

      {/* Convidar operador */}
      {podeConvidar ? (
        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-base">Convidar operador</CardTitle>
            <CardDescription>
              Gere um link de convite. O operador cria a conta com OTP e já
              entra vinculado à corretora (como <strong>operador</strong>). O
              email é opcional — serve só pra registro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={gerarConviteEquipe}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="flex-1 space-y-2">
                <Label htmlFor="email">Email do operador (opcional)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="operador@email.com"
                />
              </div>
              <SubmitButton
                pendingLabel="Gerando..."
                className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
              >
                Gerar link de convite
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      ) : (
        <LockedHint
          feature="Convidar operadores"
          description="No plano Gratuito só o dono acessa o painel. Ative o Premium para montar sua equipe com operadores ilimitados."
        />
      )}

      {/* Convites pendentes */}
      {invitesAtivos.length > 0 && (
        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-base">Convites pendentes</CardTitle>
            <CardDescription>
              Links ativos que ainda não foram usados.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-milsaca-cream-escuro">
            {invitesAtivos.map((inv) => (
              <div
                key={inv.token}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-milsaca-verde">
                    {inv.email ?? "Sem email vinculado"}
                  </p>
                  <p className="text-xs text-milsaca-verde-claro">
                    Expira em{" "}
                    {new Date(inv.expires_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <form action={revogarConviteEquipe}>
                  <input type="hidden" name="token" value={inv.token} />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="border-danger-100 text-danger-700 hover:bg-danger-50"
                  >
                    Revogar
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Operadores ativos */}
      <Card className="border-milsaca-cream-escuro">
        <CardHeader>
          <CardTitle className="text-base">
            Operadores ({team.length})
          </CardTitle>
          <CardDescription>
            Quem tem acesso ao painel desta corretora.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-milsaca-cream-escuro">
          {team.length === 0 ? (
            <p className="py-2 text-sm text-milsaca-verde-claro">
              Nenhum operador encontrado.
            </p>
          ) : (
            team.map((op) => (
              <div
                key={op.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-milsaca-cream-escuro text-milsaca-verde">
                    <UserCog className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-milsaca-verde">
                      {op.full_name ?? "Operador sem nome"}
                      {op.is_self && (
                        <span className="ml-2 text-xs font-normal text-milsaca-verde-claro">
                          (você)
                        </span>
                      )}
                    </p>
                    {op.phone && (
                      <p className="text-xs text-milsaca-verde-claro">
                        {op.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      op.corretora_role === "dono"
                        ? "bg-milsaca-dourado/20 text-milsaca-cafezal hover:bg-milsaca-dourado/20"
                        : "bg-milsaca-cream-escuro text-milsaca-verde hover:bg-milsaca-cream-escuro"
                    }
                  >
                    {op.corretora_role === "dono" ? "Dono" : "Operador"}
                  </Badge>
                  <Badge
                    className={
                      op.status === "ativo"
                        ? "bg-success-100 text-success-700 hover:bg-success-100"
                        : "bg-warning-100 text-warning-700 hover:bg-warning-100"
                    }
                  >
                    {STATUS_LABEL[op.status] ?? op.status}
                  </Badge>
                  {!op.is_self && (
                    <form action={removerOperador}>
                      <input type="hidden" name="target" value={op.id} />
                      <ConfirmSubmit
                        variant="outline"
                        size="sm"
                        className="gap-2 border-danger-100 text-danger-700 hover:bg-danger-50"
                        confirmTitle="Remover operador?"
                        confirmMessage={
                          <p>
                            <strong>{op.full_name ?? "Este operador"}</strong>{" "}
                            perderá o acesso ao painel da corretora. A conta dele
                            continua existindo, só é desvinculada.
                          </p>
                        }
                        confirmButtonLabel="Remover"
                        pendingLabel="Removendo..."
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </ConfirmSubmit>
                    </form>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
