import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubmitButton } from "@/components/submit-button";
import {
  toggleCorretoraVerified,
  updateCorretora,
} from "../../_actions";
import { CorretoraFormFields } from "../_components/corretora-form-fields";

export const metadata = { title: "Editar corretora · Admin Milsaca" };

interface PageProps {
  params: Promise<{ id: string }>;
}

// `?saved=1` / `?error=` capturados pelo ToastFromSearchParams global.
export default async function EditCorretoraPage({ params }: PageProps) {
  await requireAppAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("corretoras")
    .select(
      "id, name, slug, city, state, phone, email, verified, cnpj, inscricao_est, cep, endereco, bairro, telefone_fixo, site_url, descricao, logo_url, regioes_atendimento, lat, lng, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

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
