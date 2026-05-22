import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { updateAlert } from "../_actions";
import { AlertFormFields } from "../_components/alert-form-fields";

export const metadata = { title: "Editar alvo — Milsaca" };

type SP = Promise<{ error?: string; saved?: string }>;

export default async function EditAlvoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SP;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const [
    { data: row },
    { data: products },
    { data: regions },
  ] = await Promise.all([
    supabase
      .from("price_alerts")
      .select(
        "id, product_id, region_id, target_price, condition, channel, active, notes",
      )
      .eq("id", id)
      .eq("produtor_id", user.id)
      .maybeSingle(),
    supabase
      .from("coffee_types")
      .select("id, name")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("pracas")
      .select("id, name, state")
      .eq("active", true)
      .order("state", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (!row) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/produtor/cotacoes/alvos"
          className="inline-flex items-center gap-1 text-sm text-milsaca-verde-claro hover:text-milsaca-verde"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para alvos
        </Link>
      </div>

      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Editar alvo
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Mudanças entram em vigor na próxima verificação automática (a cada
          ~12h).
        </p>
      </header>

      {sp.saved ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          Alterações salvas.
        </p>
      ) : null}
      {sp.error ? (
        <p className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {sp.error}
        </p>
      ) : null}

      <Card className="border-milsaca-cream-escuro">
        <CardHeader>
          <CardTitle className="text-base">Dados do alvo</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateAlert} className="space-y-5">
            <input type="hidden" name="id" value={row.id} />
            <AlertFormFields
              defaults={{
                product_id: row.product_id,
                region_id: row.region_id,
                target_price: Number(row.target_price),
                condition: row.condition as "acima_de" | "abaixo_de",
                channel: row.channel as "app" | "whatsapp" | "email",
                active: row.active,
                notes: row.notes,
              }}
              products={(products ?? []) as { id: string; name: string }[]}
              regions={
                (regions ?? []) as { id: string; name: string; state: string }[]
              }
            />
            <div className="flex justify-end gap-2 border-t border-milsaca-cream-escuro/60 pt-4">
              <Button asChild variant="outline">
                <Link href="/painel/produtor/cotacoes/alvos">Cancelar</Link>
              </Button>
              <SubmitButton
                pendingLabel="Salvando..."
                className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
              >
                Salvar alterações
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
