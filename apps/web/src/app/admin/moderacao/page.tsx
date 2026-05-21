import { ShieldAlert } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { SubmitButton } from "@/components/submit-button";
import { fmtDateTime } from "@/lib/format";
import { resolveReport } from "./_actions";

export const metadata = { title: "Moderação · Admin Milsaca" };

type Status = "open" | "reviewing" | "dismissed" | "actioned";

type Row = {
  id: string;
  target_type: string;
  target_id: string;
  reporter_id: string | null;
  reason: string;
  details: string | null;
  status: Status;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
  reporter: { full_name: string | null } | null;
};

const STATUS_TONE: Record<Status, StatusTone> = {
  open: "danger",
  reviewing: "warning",
  dismissed: "neutral",
  actioned: "success",
};

const STATUS_LABEL: Record<Status, string> = {
  open: "Aberta",
  reviewing: "Em análise",
  dismissed: "Dispensada",
  actioned: "Resolvida",
};

const TARGET_LABEL: Record<string, string> = {
  corretora: "Corretora",
  produtor: "Produtor",
  lead: "Lead",
  message: "Mensagem",
};

export default async function ModeracaoPage() {
  await requireAppAdmin();
  const supabase = await createClient();

  const [{ data: reports }, kpiCounts] = await Promise.all([
    supabase
      .from("moderation_reports")
      .select(
        "id, target_type, target_id, reporter_id, reason, details, status, resolution, resolved_at, created_at, reporter:profiles(full_name)",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    Promise.all(
      (["open", "reviewing", "dismissed", "actioned"] as Status[]).map(
        async (s) => {
          const r = await supabase
            .from("moderation_reports")
            .select("*", { count: "exact", head: true })
            .eq("status", s);
          return [s, r.count ?? 0] as const;
        },
      ),
    ),
  ]);

  const counts = Object.fromEntries(kpiCounts) as Record<Status, number>;
  const rows = ((reports ?? []) as unknown as Row[]) ?? [];

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
      key: "target",
      header: "Alvo",
      mobileLabel: "Alvo",
      cell: (r) => (
        <div>
          <p className="text-sm font-medium text-slate-900">
            {TARGET_LABEL[r.target_type] ?? r.target_type}
          </p>
          <p className="font-mono text-[10px] text-slate-400">
            {r.target_id.slice(0, 8)}
          </p>
        </div>
      ),
    },
    {
      key: "reason",
      header: "Motivo",
      mobileLabel: "Motivo",
      cell: (r) => (
        <div className="text-sm">
          <p className="text-slate-900">{r.reason}</p>
          {r.details ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
              {r.details}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "reporter",
      header: "Quem denunciou",
      mobileLabel: "Denunciante",
      cell: (r) => (
        <span className="text-xs text-slate-700">
          {r.reporter?.full_name ?? (
            <span className="italic text-slate-400">anônimo</span>
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
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      align: "right",
      cell: (r) =>
        r.status === "open" || r.status === "reviewing" ? (
          <div className="flex items-center justify-end gap-2">
            {r.status === "open" ? (
              <form action={resolveReport}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="status" value="reviewing" />
                <SubmitButton
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  pendingLabel="..."
                >
                  Analisar
                </SubmitButton>
              </form>
            ) : null}
            <form action={resolveReport}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="status" value="dismissed" />
              <SubmitButton
                size="sm"
                variant="outline"
                className="h-7 text-[11px] text-slate-500"
                pendingLabel="..."
              >
                Dispensar
              </SubmitButton>
            </form>
            <form action={resolveReport}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="status" value="actioned" />
              <SubmitButton
                size="sm"
                className="h-7 bg-milsaca-cafezal text-[11px] text-milsaca-cream hover:bg-milsaca-folha"
                pendingLabel="..."
              >
                Resolver
              </SubmitButton>
            </form>
          </div>
        ) : (
          <span className="text-xs text-slate-400">
            {r.resolved_at ? fmtDateTime(r.resolved_at) : "—"}
          </span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Plataforma"
        title="Moderação"
        description="Denúncias contra corretoras, produtores, leads ou mensagens. Aberta → em análise → dispensada (sem problema) ou resolvida (ação tomada — bloqueio, edição, etc)."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Moderação" },
        ]}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Abertas"
          value={counts.open ?? 0}
          icon={ShieldAlert}
          tone={(counts.open ?? 0) > 0 ? "danger" : "default"}
          hint="Aguardando triagem."
        />
        <KpiCard
          label="Em análise"
          value={counts.reviewing ?? 0}
          tone="warning"
        />
        <KpiCard label="Resolvidas" value={counts.actioned ?? 0} tone="success" />
        <KpiCard
          label="Dispensadas"
          value={counts.dismissed ?? 0}
          hint="Sem ação necessária."
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        empty={
          <EmptyState
            icon={ShieldAlert}
            title="Nenhuma denúncia registrada"
            description="Quando produtores ou corretoras reportarem comportamento suspeito (via app público ou suporte), as denúncias aparecem aqui pra triagem."
          />
        }
      />
    </>
  );
}
