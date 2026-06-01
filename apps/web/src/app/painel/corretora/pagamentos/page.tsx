import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Wallet, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { getProfile } from "@/lib/auth";
import { requireCorretoraDono } from "../_lib/corretora";
import {
  listPagamentos,
  loadPagamentosKpis,
  signedComprovanteUrl,
  PAGAMENTOS_PAGE_SIZE,
  PAGAMENTO_STATUS_ORDER,
  type PagamentoStatus,
} from "./_lib/queries";
import { PagamentosView } from "./_components/pagamentos-view";

export const metadata = { title: "Pagamentos — Painel da corretora" };

type SearchParams = Promise<{ status?: string; page?: string }>;

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

function isStatus(v: string | undefined): v is PagamentoStatus {
  return !!v && (PAGAMENTO_STATUS_ORDER as readonly string[]).includes(v);
}

export default async function PagamentosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  requireCorretoraDono(profile);
  const sp = await searchParams;
  const status = isStatus(sp.status) ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows: itens, count }, kpis] = await Promise.all([
    listPagamentos(profile.corretora_id, { status }, page),
    loadPagamentosKpis(profile.corretora_id),
  ]);
  const totalPages = Math.max(1, Math.ceil(count / PAGAMENTOS_PAGE_SIZE));

  // Signed URLs (5 min) para comprovantes dos pagamentos já pagos.
  const comprovanteUrls: Record<string, string> = {};
  await Promise.all(
    itens
      .filter((p) => p.status === "pago" && p.comprovante_url)
      .map(async (p) => {
        const url = await signedComprovanteUrl(p.comprovante_url);
        if (url) comprovanteUrls[p.id] = url;
      }),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-milsaca-cafezal">Pagamentos ao produtor</h1>
          <p className="mt-1 max-w-2xl text-body-sm text-neutral-600">
            Controle do repasse — registre o que deve e marque como pago.
          </p>
        </div>
        <Button asChild variant="primary">
          <Link href="/painel/corretora/pagamentos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Registrar pagamento
          </Link>
        </Button>
      </header>

      <section
        aria-label="Indicadores de pagamentos"
        className="grid grid-cols-2 gap-4 lg:grid-cols-3"
      >
        <KpiCard
          label="A pagar (líquido)"
          value={BRL.format(kpis.aPagar)}
          icon={Wallet}
          tone="warning"
          hint="Pendente + vencido"
        />
        <KpiCard
          label="Já pago (líquido)"
          value={BRL.format(kpis.pago)}
          icon={CheckCircle2}
          tone="success"
          hint="Repasses confirmados"
        />
        <KpiCard
          label="Vencido (líquido)"
          value={BRL.format(kpis.vencido)}
          icon={AlertTriangle}
          tone={kpis.vencido > 0 ? "danger" : "default"}
          hint="Atrasado — priorize"
        />
      </section>

      {/* Disclaimer regulatório — NÃO REMOVER. */}
      <div className="flex items-start gap-2 rounded-md border border-info-100 bg-info-50 px-4 py-3 text-body-sm text-info-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          A Milsaca <strong>não movimenta dinheiro</strong>. O pagamento é feito
          direto com o produtor — aqui é só o controle. O produtor acompanha o
          status no Financeiro dele.
        </p>
      </div>

      {count === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="p-card">
            <EmptyState
              icon={Wallet}
              title={`Nenhum pagamento${status ? " com esse status" : ""}`}
              description="Registre o repasse de um contrato para acompanhar aqui."
              cta={{
                label: "Registrar pagamento",
                href: "/painel/corretora/pagamentos/novo",
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <PagamentosView
          itens={itens}
          comprovanteUrls={comprovanteUrls}
          current={{ status }}
          page={page}
          totalPages={totalPages}
        />
      )}
    </div>
  );
}
