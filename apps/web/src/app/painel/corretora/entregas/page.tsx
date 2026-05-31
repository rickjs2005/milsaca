import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Plus,
  Truck,
  PackageCheck,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { getProfile } from "@/lib/auth";
import {
  listEntregas,
  loadEntregasKpis,
  ENTREGAS_PAGE_SIZE,
  ENTREGA_STATUS_ORDER,
  type EntregaStatus,
} from "./_lib/queries";
import { EntregasView } from "./_components/entregas-view";

export const metadata = { title: "Entregas — Painel da corretora" };

type SearchParams = Promise<{ status?: string; page?: string }>;

const NUM = new Intl.NumberFormat("pt-BR");

function isEntregaStatus(v: string | undefined): v is EntregaStatus {
  return !!v && (ENTREGA_STATUS_ORDER as readonly string[]).includes(v);
}

export default async function EntregasCorretoraPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const sp = await searchParams;
  const status = isEntregaStatus(sp.status) ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows: entregas, count }, kpis] = await Promise.all([
    listEntregas(profile.corretora_id, { status }, page),
    loadEntregasKpis(profile.corretora_id),
  ]);
  const totalPages = Math.max(1, Math.ceil(count / ENTREGAS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-milsaca-cafezal">Entregas</h1>
          <p className="mt-1 text-body-sm text-neutral-600">
            Programação e romaneio dos contratos. Entrega conferida libera o
            pagamento ao produtor.
          </p>
        </div>
        <Button asChild variant="primary">
          <Link href="/painel/corretora/entregas/nova">
            <Plus className="mr-2 h-4 w-4" />
            Nova entrega
          </Link>
        </Button>
      </header>

      <section
        aria-label="Indicadores de entregas"
        className="grid grid-cols-2 gap-4 xl:grid-cols-4"
      >
        <KpiCard
          label="Programadas"
          value={NUM.format(kpis.programadas)}
          icon={Truck}
          tone="premium"
          hint="Aguardando retirada/chegada"
        />
        <KpiCard
          label="Em trânsito"
          value={NUM.format(kpis.emTransito)}
          icon={PackageCheck}
          tone="info"
          hint="A caminho"
        />
        <KpiCard
          label="A conferir"
          value={NUM.format(kpis.aConferir)}
          icon={ClipboardCheck}
          tone="warning"
          hint="Recebidas, falta conferir peso"
        />
        <KpiCard
          label="Atrasadas"
          value={NUM.format(kpis.atrasadas)}
          icon={AlertTriangle}
          tone={kpis.atrasadas > 0 ? "danger" : "default"}
          hint="Vencidas — trava pagamento"
        />
      </section>

      {count === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="p-card">
            <EmptyState
              icon={Truck}
              title={`Nenhuma entrega${status ? " com esse status" : ""}`}
              description="Programe a primeira entrega a partir de um contrato."
              cta={{
                label: "Nova entrega",
                href: "/painel/corretora/entregas/nova",
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <EntregasView
          entregas={entregas}
          current={{ status }}
          page={page}
          totalPages={totalPages}
        />
      )}
    </div>
  );
}
