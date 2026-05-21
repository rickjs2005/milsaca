import Link from "next/link";
import { requireAppAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { createCorretora } from "../../_actions";
import { CorretoraFormFields } from "../_components/corretora-form-fields";

export const metadata = { title: "Nova corretora · Admin Milsaca" };

// `?error=` é capturado pelo ToastFromSearchParams global do admin layout.
export default async function NovaCorretoraPage() {
  await requireAppAdmin();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Gestão"
        title="Nova corretora"
        description="Cadastre uma corretora pra ela aparecer pra produtores e poder operar na plataforma."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Corretoras", href: "/admin/corretoras" },
          { label: "Nova" },
        ]}
      />

      <form
        action={createCorretora}
        className="space-y-8 rounded-card border border-slate-200 bg-white p-6 shadow-card"
      >
        <CorretoraFormFields />

        <div className="border-t border-slate-100 pt-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="verified"
              defaultChecked
              className="h-4 w-4 cursor-pointer accent-milsaca-cafezal"
            />
            Marcar como verificada
          </label>
        </div>

        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
          <Button asChild variant="outline">
            <Link href="/admin/corretoras">Cancelar</Link>
          </Button>
          <SubmitButton
            className="gap-2 bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
            pendingLabel="Criando..."
          >
            Criar corretora
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
