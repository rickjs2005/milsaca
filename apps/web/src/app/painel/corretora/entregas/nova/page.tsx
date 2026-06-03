import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProfile } from "@/lib/auth";
import { listContratosOptions } from "../_lib/queries";
import { createEntrega } from "../_actions";
import { blockIfNoActiveSubscription } from "../../_lib/subscription-gate";

export const metadata = { title: "Nova entrega — Milsaca" };

type SearchParams = Promise<{ contrato?: string; error?: string }>;

export default async function NovaEntregaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const block = await blockIfNoActiveSubscription(profile.corretora_id, {
    action: "criar entregas",
    backHref: "/painel/corretora/entregas",
  });
  if (block) return block;

  const { contrato: preselected, error } = await searchParams;

  const contratos = await listContratosOptions(profile.corretora_id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/painel/corretora/entregas"
          className="text-xs text-milsaca-dourado hover:underline"
        >
          ← Entregas
        </Link>
        <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-milsaca-verde">
          Nova entrega
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Programe uma entrega vinculada a um contrato existente.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-danger-100 bg-danger-50 px-4 py-2 text-sm text-danger-700">
          {error}
        </p>
      ) : null}

      {contratos.length === 0 ? (
        <div className="rounded-2xl border border-milsaca-cream-escuro bg-white p-6 text-sm text-milsaca-verde-claro">
          Nenhum contrato disponível.{" "}
          <Link
            href="/painel/corretora/contratos/novo"
            className="text-milsaca-dourado hover:underline"
          >
            Criar um contrato primeiro
          </Link>
          .
        </div>
      ) : (
        <form
          action={createEntrega}
          className="space-y-4 rounded-2xl border border-milsaca-cream-escuro bg-white p-6 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="contrato_id">Contrato *</Label>
            <select
              id="contrato_id"
              name="contrato_id"
              required
              defaultValue={preselected ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">— selecione —</option>
              {contratos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.produtor_nome}
                  {c.bag_count ? ` · ${c.bag_count} sacas` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bag_count">Sacas (60kg)</Label>
              <Input
                id="bag_count"
                name="bag_count"
                type="number"
                step="1"
                min="0"
                placeholder="opcional — se vazio, herda do contrato"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_prevista">Data prevista</Label>
              <Input
                id="data_prevista"
                name="data_prevista"
                type="date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="local_retirada">Local de retirada</Label>
            <Input
              id="local_retirada"
              name="local_retirada"
              placeholder="Armazém da fazenda, tulha, terreiro..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transportadora_nome">Transportadora</Label>
            <Input
              id="transportadora_nome"
              name="transportadora_nome"
              placeholder="Nome da transportadora"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <textarea
              id="observacoes"
              name="observacoes"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Combinados, restrições de horário, etc."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button asChild variant="outline">
              <Link href="/painel/corretora/entregas">Cancelar</Link>
            </Button>
            <SubmitButton
              pendingLabel="Criando..."
              className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            >
              Criar entrega
            </SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
