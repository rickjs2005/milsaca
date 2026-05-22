import Link from "next/link";
import { notFound } from "next/navigation";
import { Link2, UserPlus } from "lucide-react";
import { headers } from "next/headers";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubmitButton } from "@/components/submit-button";
import { fmtDateTime } from "@/lib/format";
import {
  gerarConviteCorretora,
  revogarConviteCorretora,
  toggleCorretoraVerified,
  updateCorretora,
} from "../../_actions";
import { CorretoraFormFields } from "../_components/corretora-form-fields";
import { InviteLinkCard } from "../_components/invite-link-card";

export const metadata = { title: "Editar corretora · Admin Milsaca" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite_token?: string }>;
}

// `?saved=1` / `?error=` capturados pelo ToastFromSearchParams global.
export default async function EditCorretoraPage({
  params,
  searchParams,
}: PageProps) {
  await requireAppAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("corretoras")
    .select(
      "id, name, slug, city, state, phone, email, verified, cnpj, inscricao_est, cep, endereco, bairro, telefone_fixo, site_url, descricao, logo_url, regioes_atendimento, lat, lng, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  // Convites + perfis vinculados (donos)
  const [{ data: invites }, { data: members }] = await Promise.all([
    supabase
      .from("corretora_invites")
      .select("token, email, expires_at, used_at, created_at")
      .eq("corretora_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("profiles")
      .select("id, full_name, phone, role, status, created_at")
      .eq("corretora_id", id)
      .is("deleted_at", null),
  ]);

  type InviteRow = {
    token: string;
    email: string | null;
    expires_at: string;
    used_at: string | null;
    created_at: string;
  };

  const inviteList = (invites ?? []) as InviteRow[];
  const memberList = (members ?? []) as Array<{
    id: string;
    full_name: string | null;
    phone: string | null;
    role: string;
    status: string;
    created_at: string;
  }>;

  // Constrói URL absoluta pro link gerado agora (?invite_token=X)
  let newInviteUrl: string | null = null;
  let newInviteRow: InviteRow | null = null;
  if (sp.invite_token) {
    newInviteRow = inviteList.find((r) => r.token === sp.invite_token) ?? null;
    if (newInviteRow) {
      const h = await headers();
      const proto = h.get("x-forwarded-proto") ?? "https";
      const host = h.get("host") ?? "milsaca.app";
      newInviteUrl = `${proto}://${host}/convite/${newInviteRow.token}`;
    }
  }

  const activeInvites = inviteList.filter(
    (i) => !i.used_at && new Date(i.expires_at) > new Date(),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={`Slug · ${data.slug}`}
        title={data.name}
        description="Edite identidade, contato, endereço, região de atendimento e documentos da corretora."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Corretoras", href: "/admin/corretoras" },
          { label: data.name },
        ]}
        actions={
          <div className="flex items-center gap-3">
            {data.verified ? (
              <StatusBadge status="verificado" />
            ) : (
              <StatusBadge status="pendente" />
            )}
            <form action={toggleCorretoraVerified}>
              <input type="hidden" name="id" value={data.id} />
              <input
                type="hidden"
                name="verified"
                value={data.verified ? "false" : "true"}
              />
              <ConfirmSubmit
                variant="outline"
                size="sm"
                className="text-xs"
                shouldConfirm={data.verified}
                confirmTitle="Desativar corretora?"
                confirmMessage={
                  <p>
                    <strong>{data.name}</strong> sairá do catálogo público
                    (perde o selo de verificada). Você pode reativar a
                    qualquer momento.
                  </p>
                }
                confirmButtonLabel="Desativar"
                confirmButtonVariant="destructive"
                pendingLabel="Desativando..."
              >
                {data.verified ? "Desativar" : "Ativar"}
              </ConfirmSubmit>
            </form>
          </div>
        }
      />

      {/* Bloco de acesso/convite — visível antes do form de edição */}
      <section className="mb-6 space-y-3">
        {newInviteUrl ? (
          <InviteLinkCard
            inviteUrl={newInviteUrl}
            corretoraName={data.name}
          />
        ) : null}

        <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-milsaca-cafezal">
                <UserPlus className="h-4 w-4" />
                Acesso da corretora
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Gere um link único pra o dono criar conta e definir a senha
                dele. Expira em 7 dias e só serve uma vez.
              </p>
            </div>
            <form action={gerarConviteCorretora}>
              <input type="hidden" name="corretora_id" value={data.id} />
              <SubmitButton
                className="gap-2 bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
                pendingLabel="Gerando..."
              >
                <Link2 className="h-4 w-4" />
                Gerar link de convite
              </SubmitButton>
            </form>
          </div>

          {memberList.length > 0 ? (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Donos cadastrados
              </p>
              <ul className="mt-2 space-y-1.5">
                {memberList.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center gap-2 text-xs"
                  >
                    <span className="font-medium text-slate-800">
                      {m.full_name ?? "Sem nome"}
                    </span>
                    {m.phone ? (
                      <span className="text-slate-500">· {m.phone}</span>
                    ) : null}
                    <StatusBadge
                      tone={m.status === "ativo" ? "success" : "warning"}
                    >
                      {m.status}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {activeInvites.length > 0 ? (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Convites ativos
              </p>
              <ul className="mt-2 space-y-2">
                {activeInvites.map((inv) => (
                  <li
                    key={inv.token}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1 text-xs text-slate-700">
                      <code className="font-mono text-[11px] text-slate-600">
                        {inv.token.slice(0, 8)}...
                      </code>
                      {inv.email ? (
                        <span className="ml-2">para {inv.email}</span>
                      ) : null}
                      <span className="ml-2 text-slate-500">
                        expira {fmtDateTime(inv.expires_at)}
                      </span>
                    </div>
                    <form action={revogarConviteCorretora}>
                      <input type="hidden" name="token" value={inv.token} />
                      <input
                        type="hidden"
                        name="corretora_id"
                        value={data.id}
                      />
                      <SubmitButton
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        pendingLabel="..."
                      >
                        Revogar
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <form
        action={updateCorretora}
        className="space-y-8 rounded-card border border-slate-200 bg-white p-6 shadow-card"
      >
        <input type="hidden" name="id" value={data.id} />
        <CorretoraFormFields defaults={data} hideSlug />

        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
          <Button asChild variant="outline">
            <Link href="/admin/corretoras">Cancelar</Link>
          </Button>
          <SubmitButton
            className="gap-2 bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
            pendingLabel="Salvando..."
          >
            Salvar alterações
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
