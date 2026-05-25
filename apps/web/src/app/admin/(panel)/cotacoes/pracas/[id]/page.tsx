import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { updatePraca } from "../_actions";
import { PracaFormFields } from "../_components/praca-form-fields";

export const metadata = { title: "Editar praça · Admin Milsaca" };

export default async function EditPracaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAppAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("pracas")
    .select("id, slug, name, city, state, region_group, active, notes")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={`Slug · ${data.slug}`}
        title={data.name}
        description="Edite a praça. Cotações existentes não são afetadas pelo rename."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Cotações", href: "/admin/cotacoes" },
          { label: "Praças", href: "/admin/cotacoes/pracas" },
          { label: data.name },
        ]}
        actions={
          data.active ? <StatusBadge status="ativo" /> : <StatusBadge status="inativo" />
        }
      />

      <form
        action={updatePraca}
        className="space-y-6 rounded-card border border-slate-200 bg-white p-6 shadow-card"
      >
        <input type="hidden" name="id" value={data.id} />
        <PracaFormFields
          defaults={{
            name: data.name,
            slug: data.slug,
            city: data.city,
            state: data.state,
            region_group: data.region_group,
            active: data.active,
            notes: data.notes,
          }}
        />
        <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <Button asChild variant="outline">
            <Link href="/admin/cotacoes/pracas">Voltar</Link>
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
