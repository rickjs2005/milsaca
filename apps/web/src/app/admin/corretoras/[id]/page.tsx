import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "../../_components/confirm-submit";
import { SubmitButton } from "../../_components/submit-button";
import {
  toggleCorretoraVerified,
  updateCorretora,
} from "../../_actions";
import { CorretoraFormFields } from "../_components/corretora-form-fields";

export const metadata = { title: "Editar corretora · Admin Milsaca" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}

export default async function EditCorretoraPage({
  params,
  searchParams,
}: PageProps) {
  await requireAppAdmin();
  const { id } = await params;
  const { saved, error } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("corretoras")
    .select(
      "id, name, slug, city, state, phone, email, verified, cnpj, inscricao_est, cep, endereco, bairro, telefone_fixo, site_url, descricao, logo_url, regioes_atendimento, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/corretoras"
        className="text-xs text-milsaca-dourado hover:underline"
      >
        ← Corretoras
      </Link>
      <div className="mt-1 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-milsaca-verde">
            {data.name}
          </h1>
          <p className="mt-1 font-mono text-xs text-milsaca-verde-claro">
            {data.slug}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data.verified ? (
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              Verificada
            </Badge>
          ) : (
            <Badge variant="outline" className="text-milsaca-verde-claro">
              Pendente
            </Badge>
          )}
          <form action={toggleCorretoraVerified}>
            <input type="hidden" name="id" value={data.id} />
            <input
              type="hidden"
              name="verified"
              value={data.verified ? "false" : "true"}
            />
            <ConfirmSubmit
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-milsaca-dourado hover:bg-transparent hover:underline"
              shouldConfirm={data.verified}
              confirmTitle="Desativar corretora?"
              confirmMessage={
                <p>
                  <strong>{data.name}</strong> sairá do catálogo público (perde
                  o selo de verificada). Você pode reativar a qualquer momento.
                </p>
              }
              confirmButtonLabel="Desativar"
              confirmButtonVariant="destructive"
              pendingLabel="Desativando..."
            >
              {data.verified ? "Desativar" : "Ativar"}
            </ConfirmSubmit>
          </form>
        </div>
      </div>

      {saved ? (
        <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Alterações salvas.
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <form
        action={updateCorretora}
        className="mt-8 space-y-8 rounded-2xl border border-milsaca-verde/10 bg-white p-6 shadow-sm"
      >
        <input type="hidden" name="id" value={data.id} />
        <CorretoraFormFields defaults={data} hideSlug />

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button asChild variant="outline">
            <Link href="/admin/corretoras">Cancelar</Link>
          </Button>
          <SubmitButton
            className="gap-2 bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            pendingLabel="Salvando..."
          >
            Salvar
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
