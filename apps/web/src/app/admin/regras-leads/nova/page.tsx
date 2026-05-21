import Link from "next/link";
import { requireAppAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { createRule } from "../_actions";
import { RuleFormFields } from "../_components/rule-form-fields";

export const metadata = { title: "Nova regra · Admin Milsaca" };

export default async function NovaRegraPage() {
  await requireAppAdmin();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Plataforma"
        title="Nova regra de distribuição"
        description="Defina uma regra de roteamento de leads. Avaliada em ordem de prioridade quando lead é criado."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Regras de leads", href: "/admin/regras-leads" },
          { label: "Nova" },
        ]}
      />

      <form
        action={createRule}
        className="space-y-6 rounded-card border border-slate-200 bg-white p-6 shadow-card"
      >
        <RuleFormFields />
        <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <Button asChild variant="outline">
            <Link href="/admin/regras-leads">Cancelar</Link>
          </Button>
          <SubmitButton
            className="gap-2 bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
            pendingLabel="Criando..."
          >
            Criar regra
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
