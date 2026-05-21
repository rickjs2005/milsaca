import Link from "next/link";
import { requireAppAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { createPlano } from "../_actions";
import { PlanFormFields } from "../_components/plan-form-fields";

export const metadata = { title: "Novo plano · Admin Milsaca" };

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NovoPlanoPage({ searchParams }: PageProps) {
  await requireAppAdmin();
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Operação"
        title="Novo plano"
        description="Defina nome, preço, período e features que aparecem pra corretora ao escolher assinatura."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Planos", href: "/admin/planos" },
          { label: "Novo" },
        ]}
      />

      {error ? (
        <p className="mb-4 rounded-md border border-rose-500/30 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <form
        action={createPlano}
        className="space-y-6 rounded-card border border-slate-200 bg-white p-6 shadow-card"
      >
        <PlanFormFields />
        <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <Button variant="outline" asChild>
            <Link href="/admin/planos">Cancelar</Link>
          </Button>
          <SubmitButton
            className="gap-2 bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
            pendingLabel="Criando..."
          >
            Criar plano
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
