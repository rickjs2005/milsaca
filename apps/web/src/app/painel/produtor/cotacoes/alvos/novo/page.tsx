import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { createAlert } from "../_actions";
import { AlertFormFields } from "../_components/alert-form-fields";

export const metadata = { title: "Novo alvo — Milsaca" };

type SP = Promise<{
  error?: string;
  product_id?: string;
  target_price?: string;
  condition?: string;
}>;

export default async function NovoAlvoPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  await requireUser();
  const sp = await searchParams;

  const supabase = await createClient();
  const [{ data: products }, { data: regions }] = await Promise.all([
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
        <h1 className="text-h1 text-milsaca-cafezal">Novo alvo de preço</h1>
        <p className="text-body-sm text-neutral-600">
          Defina café + condição + preço. O Milsaca te avisa quando bater.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Dados do alvo</CardTitle>
          <CardDescription>
            Dedup automático: alvo dispara no máximo 1 vez a cada 24h.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAlert} className="space-y-5">
            <AlertFormFields
              defaults={{
                product_id: sp.product_id,
                target_price: sp.target_price,
                condition:
                  sp.condition === "abaixo_de" ? "abaixo_de" : "acima_de",
              }}
              products={(products ?? []) as { id: string; name: string }[]}
              regions={
                (regions ?? []) as { id: string; name: string; state: string }[]
              }
            />

            {sp.error ? (
              <p className="rounded-md border border-danger-100 bg-danger-50 px-4 py-2 text-body-sm text-danger-700">
                {sp.error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
              <Button asChild variant="outline">
                <Link href="/painel/produtor/cotacoes/alvos">Cancelar</Link>
              </Button>
              <SubmitButton variant="primary" pendingLabel="Criando...">
                Criar alvo
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
