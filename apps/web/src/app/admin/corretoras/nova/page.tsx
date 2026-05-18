import Link from "next/link";
import { requireAppAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "../../_components/submit-button";
import { createCorretora } from "../../_actions";
import { CorretoraFormFields } from "../_components/corretora-form-fields";

export const metadata = { title: "Nova corretora · Admin Milsaca" };

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NovaCorretoraPage({ searchParams }: PageProps) {
  await requireAppAdmin();
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/corretoras"
        className="text-xs text-milsaca-dourado hover:underline"
      >
        ← Corretoras
      </Link>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-milsaca-verde">
        Nova corretora
      </h1>
      <p className="mt-1 text-sm text-milsaca-verde-claro">
        Cadastre uma corretora pra ela aparecer pra produtores e poder operar.
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <form
        action={createCorretora}
        className="mt-8 space-y-8 rounded-2xl border border-milsaca-verde/10 bg-white p-6 shadow-sm"
      >
        <CorretoraFormFields />

        <div className="border-t border-milsaca-verde/10 pt-4">
          <label className="flex items-center gap-2 text-sm text-milsaca-verde-claro">
            <input type="checkbox" name="verified" defaultChecked />
            Marcar como verificada
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button asChild variant="outline">
            <Link href="/admin/corretoras">Cancelar</Link>
          </Button>
          <SubmitButton
            className="gap-2 bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            pendingLabel="Criando..."
          >
            Criar corretora
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
