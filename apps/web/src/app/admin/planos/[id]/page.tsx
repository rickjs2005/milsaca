import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { Button } from "@/components/ui/button";
import { updatePlano } from "../_actions";
import { PlanFormFields } from "../_components/plan-form-fields";

export const metadata = { title: "Editar plano · Admin Milsaca" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}

export default async function EditPlanoPage({ params, searchParams }: PageProps) {
  await requireAppAdmin();
  const { id } = await params;
  const { saved, error } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const features = Array.isArray(data.features) ? (data.features as string[]) : [];

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
          {data.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Editar valores e features.</p>
      </div>

      {saved ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          Salvo.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <form action={updatePlano} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <input type="hidden" name="id" value={id} />
        <PlanFormFields
          defaults={{
            name: data.name,
            slug: data.slug,
            description: data.description,
            price_cents: data.price_cents,
            billing_period: data.billing_period,
            features,
            active: data.active,
          }}
        />
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" asChild>
            <Link href="/admin/planos">Voltar</Link>
          </Button>
          <Button
            type="submit"
            className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
          >
            Salvar
          </Button>
        </div>
      </form>
    </div>
  );
}
