import Link from "next/link";
import { ArrowLeft, CheckCircle2, MessageCircle, Trash2 } from "lucide-react";
import { notFound, redirect } from "next/navigation";
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
import { MaskedInput } from "@/components/forms/masked-input";
import { UfSelect } from "@/components/forms/uf-select";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { getProfile } from "@/lib/auth";
import { getContato, getCorretoraNome } from "../../_lib/queries";
import { updateContato, deleteContato } from "../../_actions";
import {
  buildWhatsAppInviteUrl,
  defaultInviteMessage,
} from "../../_lib/whatsapp";

export const metadata = { title: "Editar contato — Milsaca" };

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type SearchParams = Promise<{ error?: string; saved?: string }>;
type Params = Promise<{ id: string }>;

export default async function ContatoDetalhePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const { id } = await params;
  const sp = await searchParams;

  const [contato, corretoraNome] = await Promise.all([
    getContato(profile.corretora_id, id),
    getCorretoraNome(profile.corretora_id),
  ]);
  if (!contato) notFound();

  const claimed = contato.claimed_profile_id != null;
  const waUrl = buildWhatsAppInviteUrl({
    phone: contato.phone,
    message: defaultInviteMessage({
      corretoraNome,
      produtorNome: contato.full_name,
      siteUrl: SITE_URL,
    }),
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/corretora/produtores"
          className="inline-flex items-center gap-1 text-sm text-milsaca-verde-claro hover:text-milsaca-verde"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Produtores
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
            {contato.full_name}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            {claimed ? (
              <Badge className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde">
                Vinculado — produtor já criou conta
              </Badge>
            ) : (
              <Badge className="bg-milsaca-dourado/20 text-milsaca-verde hover:bg-milsaca-dourado/20">
                Pendente — produtor ainda não tem conta
              </Badge>
            )}
          </div>
        </div>
        {waUrl && (
          <Button
            asChild
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <a href={waUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" />
              {claimed ? "Falar no WhatsApp" : "Convidar via WhatsApp"}
            </a>
          </Button>
        )}
      </header>

      {sp.saved && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          Contato atualizado.
        </div>
      )}

      <Card className="border-milsaca-cream-escuro">
        <CardHeader>
          <CardTitle className="text-base">Dados do contato</CardTitle>
          <CardDescription>
            {claimed
              ? "Este contato já foi vinculado a uma conta. Edições aqui não alteram o profile do produtor."
              : "Você pode editar até o produtor entrar com o mesmo email e o cadastro virar real."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateContato} className="grid gap-5 sm:grid-cols-2">
            <input type="hidden" name="id" value={contato.id} />

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="full_name">Nome completo *</Label>
              <Input
                id="full_name"
                name="full_name"
                required
                defaultValue={contato.full_name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={contato.email ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <MaskedInput
                id="phone"
                type="phone"
                name="phone"
                defaultValue={contato.phone ?? ""}
                validateOnBlur
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fazenda_nome">Fazenda</Label>
              <Input
                id="fazenda_nome"
                name="fazenda_nome"
                defaultValue={contato.fazenda_nome ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" name="city" defaultValue={contato.city ?? ""} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">UF</Label>
              <UfSelect
                id="state"
                name="state"
                defaultValue={contato.state ?? ""}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                defaultValue={contato.notes ?? ""}
              />
            </div>

            {sp.error && (
              <p className="text-sm text-rose-700 sm:col-span-2">{sp.error}</p>
            )}

            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button asChild variant="outline">
                <Link href="/painel/corretora/produtores">Cancelar</Link>
              </Button>
              <SubmitButton
                pendingLabel="Salvando..."
                className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
              >
                Salvar
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-rose-200">
        <CardHeader>
          <CardTitle className="text-base text-rose-700">Zona de risco</CardTitle>
          <CardDescription>
            Apagar remove apenas o contato sombra. Se houver leads vinculados, o
            sistema bloqueia o delete.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={deleteContato}>
            <input type="hidden" name="id" value={contato.id} />
            <ConfirmSubmit
              variant="outline"
              className="gap-2 border-rose-300 text-rose-700 hover:bg-rose-50"
              confirmTitle="Apagar contato?"
              confirmMessage={
                <p>
                  <strong>{contato.full_name}</strong> será removido da sua
                  carteira de contatos sombra. Leads vinculados bloqueiam o
                  delete automaticamente.
                </p>
              }
              confirmButtonLabel="Apagar contato"
              pendingLabel="Apagando..."
            >
              <Trash2 className="h-4 w-4" />
              Apagar contato
            </ConfirmSubmit>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
