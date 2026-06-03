import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Plus,
  Receipt,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { KpiMoneyCard } from "@/components/kpi-money-card";
import { getProfile } from "@/lib/auth";
import { listProdutoresEContatos, getCorretoraNome } from "./_lib/queries";
import { computeProdutoresKpis } from "./_lib/produtor-meta";
import { ProdutoresView } from "./_components/produtores-view";

export const metadata = { title: "Produtores — Painel da corretora" };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function ProdutoresPage() {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const [items, corretoraNome] = await Promise.all([
    listProdutoresEContatos(profile.corretora_id),
    getCorretoraNome(profile.corretora_id),
  ]);

  const kpis = computeProdutoresKpis(items);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-milsaca-cafezal">Produtores</h1>
          <p className="mt-1 max-w-2xl text-body-sm text-neutral-600">
            Sua carteira de produtores. Cadastre um contato mesmo antes do
            produtor entrar na plataforma — quando ele logar com o mesmo email,
            os leads dele migram automaticamente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/painel/corretora/convidar">
              <UserPlus className="mr-2 h-4 w-4" />
              Convidar produtor
            </Link>
          </Button>
          <Button asChild variant="primary">
            <Link href="/painel/corretora/produtores/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo produtor
            </Link>
          </Button>
        </div>
      </header>

      <section
        aria-label="Carteira de produtores"
        className="grid grid-cols-2 gap-4 xl:grid-cols-4"
      >
        <KpiCard
          label="Produtores"
          value={String(kpis.total)}
          icon={Users}
          tone="premium"
          hint="na sua carteira"
        />
        <KpiCard
          label="Na plataforma"
          value={String(kpis.naPlataforma)}
          icon={UserCheck}
          tone="success"
          hint="já com conta ativa"
        />
        <KpiMoneyCard
          label="Movimentado"
          value={kpis.movimentado}
          icon={TrendingUp}
          tone="info"
          compact
          hint="em contratos"
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
              icon={Users}
              title="Nenhum produtor cadastrado"
              description="Comece adicionando os contatos da sua carteira — mesmo quem ainda não entrou na plataforma."
              cta={{
                label: "Cadastrar produtor",
                href: "/painel/corretora/produtores/novo",
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <ProdutoresView
          items={items}
          corretoraNome={corretoraNome}
          siteUrl={SITE_URL}
        />
      )}
    </div>
  );
}
