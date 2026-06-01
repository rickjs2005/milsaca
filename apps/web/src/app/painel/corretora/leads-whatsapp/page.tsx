import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { fmtInt } from "@/lib/format";
import { KpiCard } from "@/components/kpi-card";
import {
  listWhatsAppLeads,
  loadWhatsAppLeadsSummary,
  WHATSAPP_LEADS_PAGE_SIZE,
} from "./_lib/queries";
import { LeadsWhatsAppView } from "./_components/leads-whatsapp-view";

export const metadata = { title: "Leads WhatsApp — Painel da corretora" };

type SearchParams = Promise<{ page?: string; source?: string }>;

export default async function LeadsWhatsAppCorretoraPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const source = sp.source?.trim() || null;

  const [{ rows, count }, summary] = await Promise.all([
    listWhatsAppLeads(profile.corretora_id, { source }, page),
    loadWhatsAppLeadsSummary(profile.corretora_id),
  ]);
  const totalPages = Math.max(1, Math.ceil(count / WHATSAPP_LEADS_PAGE_SIZE));
  const { funnel } = summary;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-milsaca-cafezal">Leads WhatsApp</h1>
        <p className="mt-1 text-body-sm text-neutral-600">
          Produtores que clicaram em “Falar no WhatsApp” com a sua corretora.
        </p>
      </header>

      <section
        aria-label="Indicadores de leads WhatsApp"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3"
      >
        <KpiCard label="Total" value={fmtInt(summary.total)} />
        <KpiCard label="Últimos 7 dias" value={fmtInt(summary.last7Days)} />
        <KpiCard label="Últimos 30 dias" value={fmtInt(summary.last30Days)} />
      </section>

      {funnel.uniquePairs > 0 ? (
        <div className="rounded-card border border-success-100 bg-success-50 px-5 py-4">
          <p className="text-caption font-semibold uppercase tracking-wide text-success-700">
            Funil de conversão
          </p>
          <p className="mt-2 text-body-sm text-success-700">
            <strong>{funnel.convertedPairs}</strong> de{" "}
            <strong>{funnel.uniquePairs}</strong> produtores que te chamaram
            viraram contrato — taxa de{" "}
            <strong>{(funnel.conversionRate * 100).toFixed(1)}%</strong>.
          </p>
        </div>
      ) : null}

      <LeadsWhatsAppView
        leads={rows}
        currentSource={source}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
