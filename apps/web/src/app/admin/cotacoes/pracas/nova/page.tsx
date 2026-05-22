import Link from "next/link";
import { requireAppAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { createPraca } from "../_actions";
import { PracaFormFields } from "../_components/praca-form-fields";

export const metadata = { title: "Nova praça · Admin Milsaca" };

export default async function NovaPracaPage() {
  await requireAppAdmin();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Compliance · Cotações"
        title="Nova praça"
        description="Cadastre uma nova praça/região onde corretoras operam (ex: Manhuaçu/MG)."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Cotações", href: "/admin/cotacoes" },
          { label: "Praças", href: "/admin/cotacoes/pracas" },
          { label: "Nova" },
        ]}
      />
      <form
        action={createPraca}
        className="space-y-6 rounded-card border border-slate-200 bg-white p-6 shadow-card"
      >
        <PracaFormFields />
        <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <Button asChild variant="outline">
            <Link href="/admin/cotacoes/pracas">Cancelar</Link>
          </Button>
          <SubmitButton
            className="gap-2 bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
            pendingLabel="Criando..."
          >
            Criar praça
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
