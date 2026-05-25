import Link from "next/link";
import { requireAppAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { createCoffeeType } from "../_actions";
import { TypeFormFields } from "../_components/type-form-fields";

export const metadata = { title: "Novo tipo · Admin Milsaca" };

export default async function NovoTipoPage() {
  await requireAppAdmin();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Compliance · Cotações"
        title="Novo tipo de café"
        description="Cadastre uma nova commodity (Café Arábica, Conilon, Robusta, Cacau, Pimenta, etc) pra usar em cotações."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Cotações", href: "/admin/cotacoes" },
          { label: "Tipos", href: "/admin/cotacoes/tipos" },
          { label: "Novo" },
        ]}
      />
      <form
        action={createCoffeeType}
        className="space-y-6 rounded-card border border-slate-200 bg-white p-6 shadow-card"
      >
        <TypeFormFields />
        <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <Button asChild variant="outline">
            <Link href="/admin/cotacoes/tipos">Cancelar</Link>
          </Button>
          <SubmitButton
            className="gap-2 bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
            pendingLabel="Criando..."
          >
            Criar tipo
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
