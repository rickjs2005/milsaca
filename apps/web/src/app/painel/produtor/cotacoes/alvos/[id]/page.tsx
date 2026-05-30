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
          className="inline-flex items-center gap-1 rounded-sm text-body-sm text-neutral-600 transition-colors hover:text-milsaca-cafezal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para alvos
        </Link>
      </div>

      <header>
        <h1 className="text-h1 text-milsaca-cafezal">Editar alvo</h1>
        <p className="text-body-sm text-neutral-600">
          Mudanças entram em vigor na próxima verificação automática (a cada
          ~12h).
        </p>
      </header>

      {sp.saved ? (
        <p className="rounded-md border border-success-100 bg-success-50 px-4 py-2 text-body-sm text-success-700">
          Alterações salvas.
        </p>
      ) : null}
      {sp.error ? (
        <p className="rounded-md border border-danger-100 bg-danger-50 px-4 py-2 text-body-sm text-danger-700">
          {sp.error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Dados do alvo</CardTitle>
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
            <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
              <Button asChild variant="outline">
                <Link href="/painel/produtor/cotacoes/alvos">Cancelar</Link>
              </Button>
              <SubmitButton variant="primary" pendingLabel="Salvando...">
                Salvar alterações
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
