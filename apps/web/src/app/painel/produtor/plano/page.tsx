import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bell, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProfile } from "@/lib/auth";
import { loadPlano } from "./_lib/queries";
import { criarMeta, cancelarMeta } from "./_actions";

export const metadata = { title: "Planejar venda — Painel do produtor" };

const NUM = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

type SearchParams = Promise<{ error?: string; ok?: string }>;

export default async function PlanoVendaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  const sp = await searchParams;
  const plano = await loadPlano(profile.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/painel/produtor"
          className="inline-flex items-center gap-1 text-body-sm text-milsaca-dourado-texto hover:underline"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Voltar para a Início
        </Link>
      </div>

      <header>
        <h1 className="flex items-center gap-2 text-h1 text-milsaca-cafezal">
          <Target aria-hidden className="h-6 w-6 text-milsaca-dourado" />
          Planejar venda
        </h1>
        <p className="mt-1 text-body-sm text-neutral-600">
          Defina quanto da sua safra quer vender e a que preço. Avisamos quando o
          mercado bater o seu alvo.
        </p>
      </header>

      {sp.error ? (
        <p className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700">
          {sp.error}
        </p>
      ) : null}

      {/* Resumo da safra + metas */}
      <Card>
        <CardContent className="p-card">
          <p className="text-caption font-semibold uppercase tracking-wider text-neutral-600">
            Safra · {NUM.format(plano.total)} sacas
          </p>
          <p className="mt-0.5 text-body-sm text-neutral-600">
            {NUM.format(plano.disponivel)} sacas disponíveis para planejar.
          </p>

          {plano.metas.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {plano.metas.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-md bg-milsaca-cream/50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-body-sm font-semibold text-milsaca-cafezal">
                      {NUM.format(m.sacas)} sacas acima de {BRL.format(m.precoAlvo)}
                      /saca
                    </p>
                    {m.temAlerta ? (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-caption text-milsaca-dourado-texto">
                        <Bell className="h-3 w-3" />
                        avisaremos no WhatsApp quando bater
                      </p>
                    ) : null}
                  </div>
                  <form action={cancelarMeta}>
                    <input type="hidden" name="id" value={m.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Cancelar
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-body-sm text-neutral-500">
              Você ainda não definiu metas de venda.
            </p>
          )}

          <p className="mt-4 rounded-md bg-neutral-50 px-3 py-2 text-body-sm text-neutral-700">
            Aguardando mercado:{" "}
            <span className="font-semibold text-milsaca-cafezal">
              {NUM.format(plano.aguardando)} sacas
            </span>
          </p>

          {plano.excede ? (
            <p className="mt-2 text-caption text-danger-700">
              Suas metas somam mais sacas do que o disponível ({NUM.format(plano.metaSacas)} de{" "}
              {NUM.format(plano.disponivel)}). Ajuste as metas ou registre mais café.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Nova meta */}
      <Card>
        <CardContent className="p-card">
          <h2 className="text-h3 text-milsaca-cafezal">Nova meta</h2>
          <form action={criarMeta} className="mt-3 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sacas">Quero vender (sacas)</Label>
                <Input
                  id="sacas"
                  name="sacas"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="500"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="preco_alvo">Acima de (R$/saca)</Label>
                <Input
                  id="preco_alvo"
                  name="preco_alvo"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="1.600"
                  required
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 rounded-md border border-neutral-200 bg-milsaca-cream/40 px-3 py-2.5">
              <input
                type="checkbox"
                name="criar_alerta"
                defaultChecked
                className="mt-0.5 h-4 w-4 shrink-0 accent-milsaca-cafezal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              />
              <span className="text-body-sm text-milsaca-cafezal">
                Me avisar no WhatsApp quando o mercado bater esse preço
                <span className="mt-0.5 block text-caption font-normal text-neutral-500">
                  Cria um alerta de preço junto com a meta.
                </span>
              </span>
            </label>

            <div className="flex justify-end">
              <Button type="submit" variant="primary">
                Adicionar meta
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
