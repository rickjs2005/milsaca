import Link from "next/link";
import {
  CheckCircle2,
  Handshake,
  MessageCircle,
  Percent,
  Plus,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { redirect } from "next/navigation";
import { KpiCard } from "@/components/kpi-card";
import { getProfile } from "@/lib/auth";
import { getCorretoraName } from "../_lib/corretora";
import {
  listLeads,
  loadLeadsKpis,
  LEADS_PAGE_SIZE,
  LEAD_STATUS_ORDER,
  type LeadStatus,
} from "./_lib/queries";
import { LEAD_ORIGEM_ORDER, type LeadOrigem } from "./_lib/lead-meta";
import { LeadsGrid } from "./_components/leads-grid";
import { fmtMoney0, fmtInt } from "@/lib/format";

export const metadata = { title: "Central de Leads — Painel da corretora" };

type SearchParams = Promise<{
  status?: string;
  origem?: string;
  urgencia?: string;
  page?: string;
}>;

function isLeadStatus(v: string | undefined): v is LeadStatus {
  return !!v && (LEAD_STATUS_ORDER as readonly string[]).includes(v);
}

function isLeadOrigem(v: string | undefined): v is LeadOrigem {
  return !!v && (LEAD_ORIGEM_ORDER as readonly string[]).includes(v);
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const sp = await searchParams;
  const status = isLeadStatus(sp.status) ? sp.status : undefined;
  const origem = isLeadOrigem(sp.origem) ? sp.origem : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows: leads, count }, kpis, corretoraName] = await Promise.all([
    listLeads(profile.corretora_id, { status, origem }, page),
    loadLeadsKpis(profile.corretora_id),
    getCorretoraName(profile.corretora_id),
  ]);
  const totalPages = Math.max(1, Math.ceil(count / LEADS_PAGE_SIZE));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-milsaca-cafezal">Central de Leads</h1>
          <p className="mt-1 text-body-sm text-neutral-600">
            Pipeline comercial da corretora — converse no WhatsApp, avance
            status e fechamento.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/painel/corretora/leads-whatsapp"
            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-4 text-sm font-medium text-milsaca-cafezal transition-colors hover:border-milsaca-dourado"
          >
            <MessageCircle className="h-4 w-4" />
            Métricas WhatsApp
          </Link>
          <Link
            href="/painel/corretora/leads/novo"
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-milsaca-cafezal px-4 text-sm font-semibold text-milsaca-cream transition-colors hover:bg-milsaca-folha"
          >
            <Plus className="h-4 w-4" />
            Novo lead
          </Link>
        </div>
      </header>

      <section
        aria-label="Indicadores de leads"
        className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5"
      >
        <KpiCard
          label="Leads novos"
          value={fmtMoney0(kpis.valorNovos)}
          icon={Handshake}
          tone="premium"
          hint={`${kpis.novos} aguardando contato`}
        />
        <KpiCard
          label="Em negociação"
          value={fmtMoney0(kpis.valorEmNeg)}
          icon={TrendingUp}
          tone="info"
          hint={`${kpis.emNeg} proposta${kpis.emNeg === 1 ? "" : "s"} aberta${kpis.emNeg === 1 ? "" : "s"}`}
        />
        <KpiCard
          label="Convertidos no mês"
          value={fmtMoney0(kpis.valorConv)}
          icon={CheckCircle2}
          tone="success"
          hint={`${kpis.convMes} fechado${kpis.convMes === 1 ? "" : "s"}`}
        />
        <KpiCard
          label="Perdidos no mês"
          value={fmtInt(kpis.perdMes)}
          icon={XCircle}
          tone="danger"
          hint="Pra aprender com o motivo"
        />
        <KpiCard
          label="Taxa de conversão"
          value={
            kpis.taxaConversao != null ? `${kpis.taxaConversao}%` : "—"
          }
          icon={Percent}
          tone="premium"
          hint="Fechados vs. perdidos no mês"
        />
      </section>

      <LeadsGrid
        leads={leads}
        corretoraName={corretoraName}
        current={{ status, origem }}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
