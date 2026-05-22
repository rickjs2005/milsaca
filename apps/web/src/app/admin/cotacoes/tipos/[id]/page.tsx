import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { updateCoffeeType } from "../_actions";
import { TypeFormFields } from "../_components/type-form-fields";

export const metadata = { title: "Editar tipo · Admin Milsaca" };

export default async function EditTipoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAppAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("coffee_types")
    .select("id, slug, name, species, process, default_unit, active, notes")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={`Slug · ${data.slug}`}
        title={data.name}
        description="Edite o tipo de café. Cotações existentes não são afetadas pelo rename."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Cotações", href: "/admin/cotacoes" },
          { label: "Tipos", href: "/admin/cotacoes/tipos" },
          { label: data.name },
        ]}
        actions={
          data.active ? <StatusBadge status="ativo" /> : <StatusBadge status="inativo" />
        }
      />

      <form
        action={updateCoffeeType}
        className="space-y-6 rounded-card border border-slate-200 bg-white p-6 shadow-card"
      >
        <input type="hidden" name="id" value={data.id} />
        <TypeFormFields
          defaults={{
            name: data.name,
            slug: data.slug,
            species: data.species,
            process: data.process,
            default_unit: data.default_unit,
            active: data.active,
            notes: data.notes,
          }}
        />
        <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <Button asChild variant="outline">
            <Link href="/admin/cotacoes/tipos">Voltar</Link>
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
