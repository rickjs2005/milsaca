import Link from "next/link";
import { requireAppAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "../../_components/submit-button";
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
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/planos"
        className="text-xs text-milsaca-dourado hover:underline"
      >
        ← Planos
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Novo plano
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Define nome, preço, período e features que aparecem pra corretora.
        </p>
      </div>

      <form action={createPlano} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <PlanFormFields />
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" asChild>
            <Link href="/admin/planos">Cancelar</Link>
          </Button>
          <SubmitButton
            className="gap-2 bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            pendingLabel="Criando..."
          >
            Criar plano
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
