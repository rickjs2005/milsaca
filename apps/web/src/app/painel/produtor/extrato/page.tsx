import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { getProfile } from "@/lib/auth";
import {
  loadMovimentacao,
  type MovimentacaoItem,
} from "./_lib/queries";

export const metadata = { title: "Extrato de Movimentação — Milsaca" };

const NUM = new Intl.NumberFormat("pt-BR");

function fmtDia(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// Cor do valor por tipo: entrada verde, venda neutra, negociação âmbar.
function valorClass(tipo: MovimentacaoItem["tipo"]): string {
  if (tipo === "entrada") return "text-success-700";
  if (tipo === "negociacao") return "text-warning-700";
  return "text-neutral-700";
}

export default async function ExtratoPage() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const itens = await loadMovimentacao(profile.id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/produtor"
          className="inline-flex items-center gap-1 text-body-sm text-milsaca-dourado-texto hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o Início
        </Link>
      </div>

      <header>
        <h1 className="text-h1 text-milsaca-cafezal">Extrato de Movimentação</h1>
        <p className="mt-1 text-body-sm text-neutral-600">
          Tudo que entrou e saiu das suas sacas.
        </p>
      </header>

      {itens.length === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="p-card">
            <EmptyState
              icon={Receipt}
              title="Nada movimentado ainda"
              description="Quando você cadastrar lotes, fechar contratos ou abrir propostas, cada movimento das suas sacas aparece aqui."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-neutral-200 p-0">
            {itens.map((it) => {
              const sinal = it.delta >= 0 ? "+" : "−";
              return (
                <div
                  key={it.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <span className="w-12 shrink-0 text-caption tabular-nums text-neutral-500">
                    {fmtDia(it.data)}
                  </span>
                  <span
                    className={`w-28 shrink-0 text-body-sm font-semibold tabular-nums ${valorClass(it.tipo)}`}
                  >
                    {sinal}
                    {NUM.format(it.sacas)} sacas
                  </span>
                  <span className="min-w-0 flex-1 text-body-sm text-neutral-700">
                    {it.descricao}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
