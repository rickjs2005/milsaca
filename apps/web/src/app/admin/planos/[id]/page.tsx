import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { updatePlano } from "../_actions";
import { PlanFormFields } from "../_components/plan-form-fields";

export const metadata = { title: "Editar plano · Admin Milsaca" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}

export default async function EditPlanoPage({ params, searchParams }: PageProps) {
  await requireAppAdmin();
  const { id } = await params;
  const { saved, error } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const features = Array.isArray(data.features) ? (data.features as string[]) : [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={`Slug · ${data.slug}`}
        title={data.name}
        description="Atualize valores, período e features. Mudanças refletem no catálogo imediatamente."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Planos", href: "/admin/planos" },
          { label: data.name },
        ]}
        actions={
          data.active ? (
            <StatusBadge status="ativo" />
          ) : (
            <StatusBadge status="inativo" />
          )
        }
      />

      {saved ? (
        <p className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Alterações salvas.
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <form
        action={updatePlano}
        className="space-y-6 rounded-card border border-slate-200 bg-white p-6 shadow-card"
      >
        <input type="hidden" name="id" value={id} />
        <PlanFormFields
          defaults={{
            name: data.name,
            slug: data.slug,
            description: data.description,
            price_cents: data.price_cents,
            billing_period: data.billing_period,
            features,
            active: data.active,
          }}
        />
        <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <Button variant="outline" asChild>
            <Link href="/admin/planos">Voltar</Link>
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
