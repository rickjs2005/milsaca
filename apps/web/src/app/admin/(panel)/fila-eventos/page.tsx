import { ListChecks, RotateCw } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { KpiCard } from "@/components/kpi-card";
import { FilterBar } from "@/components/filter-bar";
import { SubmitButton } from "@/components/submit-button";
import { fmtDateTime } from "@/lib/format";
import { reprocessEvent } from "./_actions";

export const metadata = { title: "Fila & Eventos · Admin Milsaca" };

const PAGE_SIZE = 50;

type SP = {
  status?: string;
  kind?: string;
  page?: string;
};

interface PageProps {
  searchParams: Promise<SP>;
}

type Row = {
  id: string;
  kind: string;
  status: "pending" | "processing" | "success" | "failed" | "skipped";
  payload: unknown;
  error: string | null;
  attempts: number;
  scheduled_at: string | null;
  processed_at: string | null;
  created_at: string;
};

const STATUS_TONE: Record<Row["status"], StatusTone> = {
  pending: "warning",
  processing: "info",
  success: "success",
  failed: "danger",
  skipped: "neutral",
};

const STATUS_LABEL: Record<Row["status"], string> = {
  pending: "Pendente",
  processing: "Processando",
  success: "Sucesso",
  failed: "Falhou",
  skipped: "Skipped",
};

export default async function FilaEventosPage({ searchParams }: PageProps) {
  await requireAppAdmin();
  const sp = await searchParams;
  const supabase = await createClient();

  const status = sp.status?.trim() || null;
  const kindFilter = sp.kind?.trim() || null;
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("system_events")
    .select(
      "id, kind, status, payload, error, attempts, scheduled_at, processed_at, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);
  if (kindFilter) query = query.ilike("kind", `%${kindFilter}%`);

  const [{ data, count }, kpis, { data: kinds }] = await Promise.all([
    query,
    Promise.all(
      (["pending", "processing", "success", "failed", "skipped"] as const).map(
        async (s) => {
          const r = await supabase
            .from("system_events")
            .select("*", { count: "exact", head: true })
            .eq("status", s);
          return { status: s, count: r.count ?? 0 };
        },
      ),
    ),
    supabase
      .from("system_events")
      .select("kind")
      .order("kind", { ascending: true })
      .limit(500),
  ]);

  const rows = (data ?? []) as Row[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const counts = Object.fromEntries(kpis.map((k) => [k.status, k.count]));
  const totalKnown =
    (counts.success ?? 0) + (counts.failed ?? 0) + (counts.skipped ?? 0);
  const successRate =
    totalKnown > 0 ? ((counts.success ?? 0) / totalKnown) * 100 : 0;

  // Unique kinds pra filtro chip
  const uniqueKinds = Array.from(
    new Set((kinds ?? []).map((k) => (k as { kind: string }).kind)),
  ).slice(0, 12);

  const columns: Column<Row>[] = [
    {
      key: "quando",
      header: "Quando",
      mobileLabel: "Quando",
      cell: (r) => (
        <span className="whitespace-nowrap text-xs text-slate-600">
          {fmtDateTime(r.processed_at ?? r.created_at)}
        </span>
      ),
    },
    {
      key: "kind",
      header: "Kind",
      mobileLabel: "Kind",
      cell: (r) => (
        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
          {r.kind}
        </code>
      ),
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
      key: "tentativas",
      header: "Tentativas",
      cell: (r) =>
        r.attempts > 0 ? (
          <span className="text-xs text-slate-600">{r.attempts}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
      hideOnMobile: true,
    },
    {
      key: "detalhes",
      header: "Detalhes",
      cell: (r) => (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-milsaca-cafezal underline-offset-4 hover:underline">
            {r.error ? "ver erro + payload" : "ver payload"}
          </summary>
          <div className="mt-2 space-y-1.5">
            {r.error ? (
              <p className="rounded-md bg-danger-50 p-2 font-mono text-[10px] text-danger-700">
                {r.error}
              </p>
            ) : null}
            <pre className="max-w-md overflow-x-auto rounded-md bg-slate-50 p-2 font-mono text-[10px] text-slate-700">
              {JSON.stringify(r.payload, null, 2)}
            </pre>
          </div>
        </details>
      ),
      hideOnMobile: true,
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      align: "right",
      cell: (r) =>
        r.status === "failed" || r.status === "skipped" ? (
          <form action={reprocessEvent}>
            <input type="hidden" name="id" value={r.id} />
            <SubmitButton
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2.5 text-[11px]"
              pendingLabel="..."
            >
              <RotateCw className="h-3 w-3" />
              Reprocessar
            </SubmitButton>
          </form>
        ) : null,
    },
  ];

  const hasFilters = Boolean(status || kindFilter);

  return (
    <>
      <PageHeader
        eyebrow="Plataforma"
        title="Fila & Eventos"
        description="Eventos automáticos do sistema — cron, integrações, notificações disparadas. Use pra debug, reprocessamento e observabilidade. Audit_log cobre ações humanas; aqui cobre ações do sistema."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Fila & Eventos" },
        ]}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <KpiCard
          label="Pendentes"
          value={counts.pending ?? 0}
          tone={(counts.pending ?? 0) > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Processando"
          value={counts.processing ?? 0}
          tone="info"
        />
        <KpiCard
          label="Sucessos"
          value={counts.success ?? 0}
          tone="success"
        />
        <KpiCard
          label="Falhas"
          value={counts.failed ?? 0}
          tone={(counts.failed ?? 0) > 0 ? "danger" : "default"}
        />
        <KpiCard
          label="Taxa de sucesso"
          value={`${successRate.toFixed(1)}%`}
          tone="premium"
        />
      </div>

      <div className="mb-6">
        <FilterBar
          searchParam="kind"
          searchPlaceholder="Filtrar por kind (cron.*, lead.*, notification.*)..."
          resultsLabel={`${count ?? 0} evento${count === 1 ? "" : "s"}`}
          filters={[
            {
              param: "status",
              label: "Status",
              options: [
                { value: "", label: "Todos" },
                { value: "pending", label: "Pendente" },
                { value: "processing", label: "Processando" },
                { value: "success", label: "Sucesso" },
                { value: "failed", label: "Falhou" },
                { value: "skipped", label: "Skipped" },
              ],
            },
            ...(uniqueKinds.length > 0
              ? [
                  {
                    param: "kind_exact",
                    label: "Kind comum",
                    options: [
                      { value: "", label: "Qualquer" },
                      ...uniqueKinds.map((k) => ({ value: k, label: k })),
                    ],
                  },
                ]
              : []),
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        empty={
          <EmptyState
            icon={ListChecks}
            title={
              hasFilters
                ? "Nenhum evento bate com esses filtros"
                : "Nenhum evento do sistema ainda"
            }
            description={
              hasFilters
                ? "Tente outra combinação — pode estar restrito demais."
                : "Quando o sistema rodar (cron, notificações, integrações), os eventos aparecem aqui pra rastrear."
            }
            secondaryCta={
              hasFilters
                ? { label: "Limpar filtros", href: "/admin/fila-eventos" }
                : { label: "Ver automações", href: "/admin/automacoes" }
            }
          />
        }
      />

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
          <span>
            Página {page} de {totalPages}
          </span>
        </div>
      ) : null}
    </>
  );
}
