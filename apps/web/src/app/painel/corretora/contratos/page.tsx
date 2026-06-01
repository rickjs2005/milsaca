import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FileText, Wallet, FileSignature, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { getProfile } from "@/lib/auth";
import { fmtMoney0, fmtInt } from "@/lib/format";
import { getCorretoraSubscriptionInfo } from "../_lib/corretora";
import { isProOrAbove } from "../_lib/plan-gate";
import { LockedHint } from "../_components/locked-hint";
import {
  listContratos,
  loadContratosKpis,
  CONTRATOS_PAGE_SIZE,
  CONTRATO_STATUS_ORDER,
  type ContratoStatus,
} from "./_lib/queries";
import { ContratosView } from "./_components/contratos-view";

export const metadata = { title: "Contratos — Painel da corretora" };

type SearchParams = Promise<{ status?: string; page?: string }>;

function isContratoStatus(v: string | undefined): v is ContratoStatus {
  return !!v && (CONTRATO_STATUS_ORDER as readonly string[]).includes(v);
}

export default async function ContratosCorretoraPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const sp = await searchParams;
  const status = isContratoStatus(sp.status) ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows: contratos, count }, kpis, subscription] = await Promise.all([
    listContratos(profile.corretora_id, { status }, page),
    loadContratosKpis(profile.corretora_id),
    getCorretoraSubscriptionInfo(profile.corretora_id),
  ]);
  const isPro = isProOrAbove(subscription);
  const totalPages = Math.max(1, Math.ceil(count / CONTRATOS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-milsaca-cafezal">Contratos</h1>
          <p className="mt-1 text-body-sm text-neutral-600">
            Operações fechadas (produtor → comprador). Crie a partir de um lead
            convertido ou direto.
          </p>
        </div>
        {isPro ? (
          <Button asChild variant="primary">
            <Link href="/painel/corretora/contratos/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo contrato
            </Link>
          </Button>
        ) : null}
      </header>

      {!isPro ? (
        <LockedHint
          feature="contratos"
          description="Gerencie contratos completos com comissão automática, status e timeline. Disponível no plano Premium."
        />
      ) : null}

      <section
        aria-label="Indicadores de contratos"
        className="grid grid-cols-2 gap-4 xl:grid-cols-4"
      >
        <KpiCard
          label="Em contratos ativos"
          value={fmtMoney0(kpis.ativosValor)}
          icon={FileText}
          tone="premium"
          hint="Valor total em execução"
        />
        <KpiCard
          label="Comissão projetada"
          value={fmtMoney0(kpis.comissaoProjetada)}
          icon={Wallet}
          tone="success"
          hint="Ativos + finalizados"
        />
        <KpiCard
          label="Aguardando assinatura"
          value={fmtInt(kpis.aguardandoAssinatura)}
          icon={FileSignature}
          tone="info"
          hint="Rascunho + em análise"
        />
        <KpiCard
          label="Finalizados"
          value={fmtInt(kpis.finalizados)}
          icon={CheckCircle2}
          hint="Concluídos"
        />
      </section>

      {count === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="p-card">
            <EmptyState
              icon={FileText}
              title={`Nenhum contrato${status ? " com esse status" : ""}`}
              description="Crie o primeiro a partir de um lead convertido."
              cta={
                isPro
                  ? {
                      label: "Novo contrato",
                      href: "/painel/corretora/contratos/novo",
                    }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <ContratosView
          contratos={contratos}
          current={{ status }}
          page={page}
          totalPages={totalPages}
        />
      )}
    </div>
  );
}
