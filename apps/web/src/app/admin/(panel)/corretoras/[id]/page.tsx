import Link from "next/link";
import { notFound } from "next/navigation";
import { Link2, Sparkles, UserPlus } from "lucide-react";
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
  grantCorretoraTier,
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
      "id, name, slug, city, state, phone, email, verified, cnpj, inscricao_est, cep, endereco, bairro, telefone_fixo, site_url, descricao, logo_url, regioes_atendimento, especialidades, lat, lng, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  // Convites + perfis vinculados (donos) + subscription (pra bloco de plano)
  const [
    { data: invites },
    { data: members },
    { data: subscription },
  ] = await Promise.all([
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
    supabase
      .from("subscriptions")
      .select("status, current_period_end, plans(name, slug)")
      .eq("corretora_id", id)
      .maybeSingle(),
  ]);

  type SubRow = {
    status: "trial" | "active" | "past_due" | "canceled" | "expired";
    current_period_end: string | null;
    plans:
      | { name: string; slug: string }
      | { name: string; slug: string }[]
      | null;
  };
  const sub = (subscription ?? null) as SubRow | null;
  const subPlan = sub
    ? Array.isArray(sub.plans)
      ? (sub.plans[0] ?? null)
      : sub.plans
    : null;
  const tierAtual: "gratuito" | "pro" | "premium" = (() => {
    if (!sub || sub.status !== "active") return "gratuito";
    const slug = subPlan?.slug ?? "";
    if (slug === "corretora-premium") return "premium";
    if (slug === "corretora-pro") return "pro";
    return "gratuito";
  })();

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

      {/* Bloco "Plano comercial" — atalho admin pra liberar features */}
      <section className="mb-6 rounded-card border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-milsaca-cafezal">
              <Sparkles className="h-4 w-4" />
              Plano comercial
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Libera todas as features (Analytics, Automação, Contratos,
              Entregas) pra esta corretora. Premium é vitalício (+100 anos);
              Pro vai por 1 ano e renova manualmente.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Hoje:</span>
            <span
              className={
                tierAtual === "premium"
                  ? "rounded-full bg-milsaca-dourado/20 px-2.5 py-1 font-semibold text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/40"
                  : tierAtual === "pro"
                    ? "rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800"
                    : "rounded-full bg-slate-200 px-2.5 py-1 font-semibold text-slate-700"
              }
            >
              {tierAtual === "premium"
                ? "Premium"
                : tierAtual === "pro"
                  ? "Pro"
                  : "Gratuito"}
            </span>
            {sub?.current_period_end ? (
              <span className="text-slate-500">
                · vence {fmtDateTime(sub.current_period_end)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <form action={grantCorretoraTier}>
            <input type="hidden" name="corretora_id" value={data.id} />
            <input type="hidden" name="tier" value="premium" />
            <SubmitButton
              className="gap-1.5 bg-milsaca-dourado text-milsaca-preto shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_6px_18px_-8px_rgba(201,169,97,0.5)] hover:brightness-105 disabled:opacity-60"
              pendingLabel="Liberando..."
              disabled={tierAtual === "premium"}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {tierAtual === "premium"
                ? "Já é Premium"
                : "Liberar tudo (Premium)"}
            </SubmitButton>
          </form>

          <form action={grantCorretoraTier}>
            <input type="hidden" name="corretora_id" value={data.id} />
            <input type="hidden" name="tier" value="pro" />
            <SubmitButton
              variant="outline"
              className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
              pendingLabel="Liberando..."
              disabled={tierAtual === "pro"}
            >
              {tierAtual === "pro" ? "Já é Pro" : "Liberar Pro (+1 ano)"}
            </SubmitButton>
          </form>

          {tierAtual !== "gratuito" ? (
            <form action={grantCorretoraTier}>
              <input type="hidden" name="corretora_id" value={data.id} />
              <input type="hidden" name="tier" value="gratuito" />
              <ConfirmSubmit
                variant="outline"
                className="text-slate-600 hover:bg-slate-100"
                pendingLabel="Rebaixando..."
                confirmTitle="Rebaixar pra Gratuito?"
                confirmMessage={
                  <p>
                    <strong>{data.name}</strong> perde acesso a Analytics,
                    Automação, Contratos e Entregas. Dados existentes ficam
                    em modo leitura.
                  </p>
                }
                confirmButtonLabel="Rebaixar"
                confirmButtonVariant="destructive"
              >
                Voltar pra Gratuito
              </ConfirmSubmit>
            </form>
          ) : null}
        </div>

        {subPlan ? (
          <p className="mt-3 text-[11px] text-slate-500">
            Plano técnico:{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px]">
              {subPlan.slug}
            </code>{" "}
            · gerência fina em{" "}
            <Link
              href="/admin/assinaturas"
              className="font-medium text-milsaca-cafezal hover:underline"
            >
              /admin/assinaturas →
            </Link>
          </p>
        ) : null}
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
