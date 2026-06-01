import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Plus, Receipt, ShoppingCart, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { KpiMoneyCard } from "@/components/kpi-money-card";
import { getProfile } from "@/lib/auth";
import { listCompradores, getCorretoraNome } from "./_lib/queries";
import { computeCompradoresKpis } from "./_lib/comprador-meta";
import { CompradoresView } from "./_components/compradores-view";

export const metadata = { title: "Compradores — Painel da corretora" };

type SearchParams = Promise<{ ok?: string; error?: string }>;

export default async function CompradoresPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const { ok, error } = await searchParams;
  const [items, corretoraNome] = await Promise.all([
    listCompradores(profile.corretora_id),
    getCorretoraNome(profile.corretora_id),
  ]);
  const kpis = computeCompradoresKpis(items);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-milsaca-cafezal">Compradores</h1>
          <p className="mt-1 max-w-2xl text-body-sm text-neutral-600">
            Indústrias, exportadores, tradings e torrefadores que compram seu
            café intermediado. É o lado de saída da venda.
          </p>
        </div>
        <Button asChild variant="primary">
          <Link href="/painel/corretora/compradores/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo comprador
          </Link>
        </Button>
      </header>

      {ok ? (
        <div className="rounded-md border border-success-100 bg-success-50 px-4 py-2 text-body-sm text-success-700">
          {ok}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-danger-100 bg-danger-50 px-4 py-2 text-body-sm text-danger-700">
          {error}
        </div>
      ) : null}

      <section
        aria-label="Carteira de compradores"
        className="grid grid-cols-2 gap-4 xl:grid-cols-4"
      >
        <KpiCard
          label="Compradores"
          value={String(kpis.total)}
          icon={Building2}
          tone="premium"
          hint="na sua carteira"
        />
        <KpiCard
          label="Ativos"
          value={String(kpis.ativos)}
          icon={ShoppingCart}
          tone="success"
          hint="comprando hoje"
        />
        <KpiMoneyCard
          label="Comprado"
          value={kpis.comprado}
          icon={TrendingUp}
          tone="info"
          compact
          hint="em contratos fechados"
        />
        <KpiMoneyCard
          label="Ticket médio"
          value={kpis.ticketMedio}
          icon={Receipt}
          tone="default"
          hint="por contrato"
        />
      </section>

      {items.length === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="p-card">
            <EmptyState
              icon={Building2}
              title="Nenhum comprador cadastrado"
              description="Cadastre as indústrias, exportadores e torrefadores da sua carteira para casar oferta com comprador certo."
              cta={{
                label: "Cadastrar comprador",
                href: "/painel/corretora/compradores/novo",
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <CompradoresView items={items} corretoraNome={corretoraNome} />
      )}
    </div>
  );
}
