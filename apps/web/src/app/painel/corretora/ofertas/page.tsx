import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Plus,
  Store,
  Send,
  CheckCircle2,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { getProfile } from "@/lib/auth";
import {
  listOfertas,
  loadOfertasKpis,
  OFERTAS_PAGE_SIZE,
  OFERTA_STATUS_ORDER,
  type OfertaStatus,
} from "./_lib/queries";
import { OfertasView } from "./_components/ofertas-view";
import { fmtMoney0, fmtInt } from "@/lib/format";

export const metadata = { title: "Ofertas a compradores — Painel da corretora" };

type SearchParams = Promise<{ status?: string; page?: string }>;

function isStatus(v: string | undefined): v is OfertaStatus {
  return (OFERTA_STATUS_ORDER as readonly string[]).includes(v ?? "");
}

export default async function OfertasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const sp = await searchParams;
  const status = isStatus(sp.status) ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows: itens, count }, kpis] = await Promise.all([
    listOfertas(profile.corretora_id, { status }, page),
    loadOfertasKpis(profile.corretora_id),
  ]);
  const totalPages = Math.max(1, Math.ceil(count / OFERTAS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-milsaca-cafezal">Ofertas a compradores</h1>
          <p className="mt-1 max-w-2xl text-body-sm text-neutral-600">
            O que você ofertou a cada comprador. A conversa é no WhatsApp; aqui é
            o controle. Ao aceitar, gere o contrato em 1 clique.
          </p>
        </div>
        <Button asChild variant="primary">
          <Link href="/painel/corretora/ofertas/novo">
            <Plus className="mr-2 h-4 w-4" />
            Nova oferta
          </Link>
        </Button>
      </header>

      <section
        aria-label="Indicadores de ofertas"
        className="grid grid-cols-2 gap-4 xl:grid-cols-4"
      >
        <KpiCard
          label="Ofertado"
          value={fmtMoney0(kpis.ofertado)}
          icon={Store}
          tone="premium"
          hint="Em ofertas enviadas + aceitas"
        />
        <KpiCard
          label="Enviadas"
          value={fmtInt(kpis.enviadas)}
          icon={Send}
          tone="info"
          hint="Aguardando resposta"
        />
        <KpiCard
          label="Aceitas"
          value={fmtInt(kpis.aceitas)}
          icon={CheckCircle2}
          tone="success"
          hint="Prontas pra virar contrato"
        />
        <KpiCard
          label="Conversão"
          value={`${kpis.conversao}%`}
          icon={Percent}
          hint="Aceitas / ofertas enviadas"
        />
      </section>

      {count === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="p-card">
            <EmptyState
              icon={Store}
              title={`Nenhuma oferta${status ? " com esse status" : ""}`}
              description="Ofereça um lote a um comprador para acompanhar aqui."
              cta={{
                label: "Nova oferta",
                href: "/painel/corretora/ofertas/novo",
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <OfertasView
          ofertas={itens}
          current={{ status }}
          page={page}
          totalPages={totalPages}
        />
      )}
    </div>
  );
}
