import Link from "next/link";
import { Inbox } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { MaskedInput } from "@/components/forms/masked-input";
import { UfSelect } from "@/components/forms/uf-select";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { fmtDateTime } from "@/lib/format";
import { aprovarCorretora, rejeitarCorretora } from "../_actions";

export const metadata = { title: "Aprovações · Admin Milsaca" };

type PendingSignup = {
  profile_id: string;
  email: string | null;
  full_name: string | null;
  signup_at: string;
  corretora_name: string | null;
  corretora_cnpj: string | null;
  corretora_city: string | null;
  corretora_uf: string | null;
  corretora_whatsapp: string | null;
};

interface PageProps {
  searchParams: Promise<{ ok?: string; error?: string }>;
}

export default async function AdminAprovacoesPage({
  searchParams: _searchParams,
}: PageProps) {
  await requireAppAdmin();

  const supabase = await createClient();
  const { data, error: rpcError } = await supabase.rpc(
    "list_pending_corretora_signups",
  );
  const rows: PendingSignup[] = (data ?? []) as PendingSignup[];

  const { data: fp } = await supabase.rpc("founder_program_status");
  const founder = (fp ?? {}) as {
    open?: boolean;
    total?: number;
    used?: number;
  };
  const fTotal = typeof founder.total === "number" ? founder.total : 5;
  const fUsed = typeof founder.used === "number" ? founder.used : 0;
  const fOpen = founder.open ?? true;
  const fStatusLabel = !fOpen
    ? "fechado manualmente"
    : fUsed >= fTotal
      ? "cheio — cadastro fechado"
      : "aberto";

  return (
    <>
      <PageHeader
        eyebrow="Gestão"
        title="Aprovações de corretora"
        description={
          rows.length > 0
            ? `${rows.length} ${rows.length === 1 ? "cadastro" : "cadastros"} aguardando análise.`
            : "Tudo em dia — nenhum cadastro pendente no momento."
        }
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Aprovações" },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card border border-milsaca-dourado/40 bg-milsaca-dourado/10 px-4 py-3 text-sm">
        <span className="font-semibold text-milsaca-preto">
          Programa Fundadoras: {fUsed} de {fTotal} vagas
        </span>
        <span
          className={
            fOpen && fUsed < fTotal ? "text-success-700" : "text-slate-500"
          }
        >
          · {fStatusLabel}
        </span>
        <Link
          href="/admin/configuracoes"
          className="ml-auto text-xs font-medium text-milsaca-verde hover:underline"
        >
          Ajustar vagas
        </Link>
      </div>

      {rpcError ? (
        <p className="mb-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Não foi possível carregar pendentes agora. Tente novamente em alguns
          minutos.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-card border border-slate-200 bg-white shadow-card">
          <EmptyState
            icon={Inbox}
            title="Nenhuma corretora aguardando aprovação"
            description="Quando alguém se cadastrar como corretora, o pedido aparece aqui pra você revisar e ativar."
            secondaryCta={{ label: "Ver corretoras ativas", href: "/admin/corretoras" }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {rows.map((row) => (
            <article
              key={row.profile_id}
              className="rounded-card border border-slate-200 bg-white p-6 shadow-card"
            >
              <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-milsaca-preto">
                    {row.corretora_name ?? "Corretora sem nome"}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Solicitado por{" "}
                    <span className="font-medium text-slate-700">
                      {row.full_name ?? "—"}
                    </span>{" "}
                    · {row.email ?? "sem email"} · {fmtDateTime(row.signup_at)}
                  </p>
                </div>
              </header>

              <form action={aprovarCorretora} className="mt-4 space-y-4">
                <input type="hidden" name="profile_id" value={row.profile_id} />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Nome da corretora" htmlFor={`name-${row.profile_id}`} required>
                    <Input
                      id={`name-${row.profile_id}`}
                      name="name"
                      defaultValue={row.corretora_name ?? ""}
                      required
                    />
                  </FormField>
                  <FormField label="CNPJ" htmlFor={`cnpj-${row.profile_id}`} required>
                    <MaskedInput
                      id={`cnpj-${row.profile_id}`}
                      type="cnpj"
                      name="cnpj"
                      required
                      defaultValue={row.corretora_cnpj ?? ""}
                      validateOnBlur
                    />
                  </FormField>
                  <FormField label="Cidade" htmlFor={`city-${row.profile_id}`} required>
                    <Input
                      id={`city-${row.profile_id}`}
                      name="city"
                      defaultValue={row.corretora_city ?? ""}
                      required
                    />
                  </FormField>
                  <FormField label="UF" htmlFor={`state-${row.profile_id}`} required>
                    <UfSelect
                      id={`state-${row.profile_id}`}
                      name="state"
                      required
                      defaultValue={row.corretora_uf ?? "MG"}
                    />
                  </FormField>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <ConfirmSubmit
                    formAction={rejeitarCorretora}
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    confirmTitle="Rejeitar cadastro?"
                    confirmMessage={
                      <>
                        <p>
                          A corretora{" "}
                          <strong>{row.corretora_name ?? "—"}</strong> terá o
                          cadastro <strong>bloqueado</strong> e não vai
                          conseguir acessar a plataforma.
                        </p>
                        <p className="mt-2">
                          Ação reversível só via banco (atualizar{" "}
                          <code>profiles.status</code>).
                        </p>
                      </>
                    }
                    confirmButtonLabel="Rejeitar"
                    pendingLabel="Rejeitando..."
                  >
                    Rejeitar
                  </ConfirmSubmit>
                  <SubmitButton
                    className="gap-2 bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
                    pendingLabel="Aprovando..."
                  >
                    Aprovar e criar corretora
                  </SubmitButton>
                </div>
              </form>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
