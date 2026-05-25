import { Users } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { SubmitButton } from "@/components/submit-button";
import { fmtDateTime } from "@/lib/format";
import { setWaitlistStatus } from "./_actions";

export const metadata = { title: "Lista de espera · Admin Milsaca" };

type Status = "pending" | "contacted" | "converted" | "dropped";

type Row = {
  id: string;
  source: string;
  payload: Record<string, unknown>;
  region: string | null;
  specie: string | null;
  contact: string | null;
  status: Status;
  notes: string | null;
  handled_at: string | null;
  created_at: string;
};

const STATUS_TONE: Record<Status, StatusTone> = {
  pending: "warning",
  contacted: "info",
  converted: "success",
  dropped: "neutral",
};

const STATUS_LABEL: Record<Status, string> = {
  pending: "Aberto",
  contacted: "Contatado",
  converted: "Convertido",
  dropped: "Descartado",
};

function describeSource(source: string, payload: Record<string, unknown>): string {
  if (source === "whatsapp_lead_fallback") {
    const c = payload?.corretora_name_intended;
    return c ? `Tentou ${c}` : "Fallback de WhatsApp lead";
  }
  return source;
}

export default async function LeadWaitlistPage() {
  await requireAppAdmin();
  const supabase = await createClient();

  const [{ data: rows }, kpiCounts] = await Promise.all([
    supabase
      .from("lead_waitlist")
      .select(
        "id, source, payload, region, specie, contact, status, notes, handled_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    Promise.all(
      (["pending", "contacted", "converted", "dropped"] as Status[]).map(
        async (s) => {
          const r = await supabase
            .from("lead_waitlist")
            .select("*", { count: "exact", head: true })
            .eq("status", s);
          return [s, r.count ?? 0] as const;
        },
      ),
    ),
  ]);

  const counts = Object.fromEntries(kpiCounts) as Record<Status, number>;
  const list = (rows ?? []) as Row[];

  const columns: Column<Row>[] = [
    {
      key: "quando",
      header: "Quando",
      mobileLabel: "Quando",
      cell: (r) => (
        <span className="whitespace-nowrap text-xs text-slate-600">
          {fmtDateTime(r.created_at)}
        </span>
      ),
    },
    {
      key: "source",
      header: "Origem",
      mobileLabel: "Origem",
      cell: (r) => (
        <div>
          <p className="text-sm text-slate-900">
            {describeSource(r.source, r.payload)}
          </p>
          <p className="font-mono text-[10px] text-slate-400">{r.source}</p>
        </div>
      ),
    },
    {
      key: "contato",
      header: "Contato",
      mobileLabel: "Contato",
      cell: (r) => (
        <span className="font-mono text-xs text-slate-700">
          {r.contact ?? <span className="text-slate-400">—</span>}
        </span>
      ),
    },
    {
      key: "regiao",
      header: "Região / Café",
      mobileLabel: "Região",
      cell: (r) => (
        <span className="text-xs text-slate-700">
          {[r.region, r.specie].filter(Boolean).join(" · ") || (
            <span className="text-slate-400">—</span>
          )}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "status",
      header: "Status",
      mobileLabel: "Status",
      cell: (r) => (
        <StatusBadge tone={STATUS_TONE[r.status]}>
          {STATUS_LABEL[r.status]}
        </StatusBadge>
      ),
    },
    {
      key: "notes",
      header: "Notas",
      cell: (r) =>
        r.notes ? (
          <span className="line-clamp-2 text-xs text-slate-600">{r.notes}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
      hideOnMobile: true,
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      align: "right",
      cell: (r) =>
        r.status === "pending" || r.status === "contacted" ? (
          <div className="flex items-center justify-end gap-2">
            {r.status === "pending" ? (
              <form action={setWaitlistStatus}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="status" value="contacted" />
                <SubmitButton
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  pendingLabel="..."
                >
                  Contatei
                </SubmitButton>
              </form>
            ) : null}
            <form action={setWaitlistStatus}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="status" value="dropped" />
              <SubmitButton
                size="sm"
                variant="outline"
                className="h-7 text-[11px] text-slate-500"
                pendingLabel="..."
              >
                Descartar
              </SubmitButton>
            </form>
            <form action={setWaitlistStatus}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="status" value="converted" />
              <SubmitButton
                size="sm"
                className="h-7 bg-milsaca-cafezal text-[11px] text-milsaca-cream hover:bg-milsaca-folha"
                pendingLabel="..."
              >
                Convertido
              </SubmitButton>
            </form>
          </div>
        ) : (
          <span className="text-xs text-slate-400">
            {r.handled_at ? fmtDateTime(r.handled_at) : "—"}
          </span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Plataforma"
        title="Lista de espera"
        description="Leads que caíram em fallback — corretora escolhida vencida/não-verificada, sem corretora elegível em regras smart, ou denúncia sob revisão. Suporte trata um a um até virar contrato (Convertido) ou descartar."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Lista de espera" },
        ]}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Abertos"
          value={counts.pending ?? 0}
          icon={Users}
          tone={(counts.pending ?? 0) > 0 ? "warning" : "default"}
          hint="Aguardando contato."
        />
        <KpiCard label="Contatados" value={counts.contacted ?? 0} tone="info" />
        <KpiCard
          label="Convertidos"
          value={counts.converted ?? 0}
          tone="success"
        />
        <KpiCard
          label="Descartados"
          value={counts.dropped ?? 0}
          hint="Sem follow-up necessário."
        />
      </div>

      <DataTable
        columns={columns}
        data={list}
        rowKey={(r) => r.id}
        empty={
          <EmptyState
            icon={Users}
            title="Nada na lista de espera"
            description="Quando algum lead cair em fallback (corretora sem assinatura, regra de skip, etc), aparece aqui pra suporte tratar manualmente."
            secondaryCta={{ label: "Ver regras", href: "/admin/regras-leads" }}
          />
        }
      />
    </>
  );
}
