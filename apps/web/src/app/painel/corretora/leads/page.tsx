import Link from "next/link";
import {
  CheckCircle2,
  Handshake,
  Plus,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { redirect } from "next/navigation";
import { KpiCard } from "@/components/kpi-card";
import { getProfile } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import {
  listLeads,
  LEADS_PAGE_SIZE,
  LEAD_STATUS_ORDER,
  type LeadStatus,
} from "./_lib/queries";
import {
  URGENCIA_FILTER_ORDER,
  type Urgencia,
} from "./_lib/next-action";
import { LeadsGrid } from "./_components/leads-grid";

export const metadata = { title: "Central de Leads — Painel da corretora" };

type SearchParams = Promise<{
  status?: string;
  urgencia?: string;
  page?: string;
}>;

function isLeadStatus(v: string | undefined): v is LeadStatus {
  return !!v && (LEAD_STATUS_ORDER as readonly string[]).includes(v);
}

function isUrgencia(v: string | undefined): v is Urgencia {
  return !!v && (URGENCIA_FILTER_ORDER as readonly string[]).includes(v);
}

const NUM = new Intl.NumberFormat("pt-BR");

async function loadLeadsKpis(corretoraId: string) {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthIso = monthStart.toISOString();

  const [novos, emNeg, convMes, perdMes] = await Promise.all([
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("status", "novo"),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("status", "em_negociacao"),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("status", "convertido")
      .gte("updated_at", monthIso),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("corretora_id", corretoraId)
      .eq("status", "perdido")
      .gte("updated_at", monthIso),
  ]);

  return {
    novos: novos.count ?? 0,
    emNeg: emNeg.count ?? 0,
    convMes: convMes.count ?? 0,
    perdMes: perdMes.count ?? 0,
  };
}

async function loadCorretoraName(corretoraId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("corretoras")
    .select("name")
    .eq("id", corretoraId)
    .maybeSingle<{ name: string | null }>();
  return data?.name ?? "Milsaca";
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
  const urgencia = isUrgencia(sp.urgencia) ? sp.urgencia : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows: leads, count }, kpis, corretoraName] = await Promise.all([
    listLeads(profile.corretora_id, { status }, page),
    loadLeadsKpis(profile.corretora_id),
    loadCorretoraName(profile.corretora_id),
  ]);
  const totalPages = Math.max(1, Math.ceil(count / LEADS_PAGE_SIZE));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-milsaca-verde">Central de Leads</h1>
          <p className="mt-1 text-body-sm text-neutral-600">
            Pipeline comercial da corretora — converse no WhatsApp, avance
            status e fechamento.
          </p>
        </div>
        <Link
          href="/painel/corretora/leads/novo"
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-milsaca-cafezal px-4 text-sm font-semibold text-milsaca-cream transition-colors hover:bg-milsaca-folha"
        >
          <Plus className="h-4 w-4" />
          Novo lead
        </Link>
      </header>

      <section
        aria-label="Indicadores de leads"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="Leads novos"
          value={NUM.format(kpis.novos)}
          icon={Handshake}
          tone="premium"
          hint="Aguardando primeiro contato"
        />
        <KpiCard
          label="Em negociação"
          value={NUM.format(kpis.emNeg)}
          icon={TrendingUp}
          tone="info"
          hint="Propostas abertas"
        />
        <KpiCard
          label="Convertidos no mês"
          value={NUM.format(kpis.convMes)}
          icon={CheckCircle2}
          tone="success"
          hint="Fechados a partir do dia 1"
        />
        <KpiCard
          label="Perdidos no mês"
          value={NUM.format(kpis.perdMes)}
          icon={XCircle}
          tone="danger"
          hint="Pra aprender com o motivo"
        />
      </section>

      <LeadsGrid
        leads={leads}
        corretoraName={corretoraName}
        current={{ status, urgencia }}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
