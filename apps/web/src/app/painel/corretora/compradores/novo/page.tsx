import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { requireRole } from "@/lib/auth";
import { CompradorFormFields } from "../_components/comprador-form-fields";
import { createComprador } from "../_actions";

export const metadata = { title: "Novo comprador — Milsaca" };

type SearchParams = Promise<{ error?: string }>;

export default async function NovoCompradorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireRole("corretora", "admin");
  if (!profile.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/painel/corretora/compradores"
          className="text-xs text-milsaca-dourado-texto hover:underline"
        >
          ← Compradores
        </Link>
        <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-milsaca-verde">
          Novo comprador
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Cadastre indústria, exportador, trading ou torrefador.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-danger-100 bg-danger-50 px-4 py-2 text-sm text-danger-700">
          {error}
        </p>
      ) : null}

      <form
        action={createComprador}
        className="space-y-4 rounded-2xl border border-milsaca-cream-escuro bg-white p-6 shadow-sm"
      >
        <CompradorFormFields />
        <div className="flex justify-end gap-3 pt-2">
          <Button asChild variant="outline">
            <Link href="/painel/corretora/compradores">Cancelar</Link>
          </Button>
          <SubmitButton
            pendingLabel="Criando..."
            className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
          >
            Criar comprador
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
