import Link from "next/link";
import { ChevronRight, Receipt } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type StatusKey } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Assinaturas · Admin Milsaca" };

type SubStatus = "trial" | "active" | "past_due" | "canceled" | "expired";

interface PageProps {
  searchParams: Promise<{ ok?: string; error?: string }>;
}

function effectiveStatus(sub: {
  status: SubStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
}): SubStatus {
  const now = Date.now();
  if (
    sub.status === "trial" &&
    sub.trial_ends_at &&
    new Date(sub.trial_ends_at).getTime() < now
  ) {
    return "expired";
  }
  if (
    sub.status === "active" &&
    sub.current_period_end &&
    new Date(sub.current_period_end).getTime() < now
  ) {
    return "past_due";
  }
  return sub.status;
}

const STATUS_KEY: Record<SubStatus, StatusKey> = {
  trial: "trial",
  active: "ativo",
  past_due: "past_due",
  canceled: "cancelado",
  expired: "expirado",
};

type Row = {
  id: string;
  status: SubStatus;
  started_at: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  corretora_id: string;
  corretoras: { id: string; name: string; city: string | null; state: string | null } | null;
  plans: { id: string; name: string; slug: string; price_cents: number; billing_period: "monthly" | "yearly" } | null;
};

export default async function AssinaturasAdminPage({
  searchParams: _searchParams,
}: PageProps) {
  await requireAppAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("subscriptions")
    .select(`
      id,
      status,
      started_at,
      trial_ends_at,
      current_period_end,
      corretora_id,
      corretoras(id, name, city, state),
      plans(id, name, slug, price_cents, billing_period)
    `)
    .order("started_at", { ascending: false });

  const rows = (data ?? []) as unknown as Row[];

  const columns: Column<Row>[] = [
    {
      key: "corretora",
      header: "Corretora",
      mobileLabel: "Corretora",
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-900">
            {r.corretoras?.name ?? "—"}
          </p>
          {r.corretoras?.city || r.corretoras?.state ? (
            <p className="text-xs text-slate-500">
              {[r.corretoras?.city, r.corretoras?.state]
                .filter(Boolean)
                .join(" / ")}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "plano",
      header: "Plano",
      mobileLabel: "Plano",
      cell: (r) =>
        r.plans?.name ?? <span className="text-slate-400">sem plano</span>,
    },
    {
      key: "status",
      header: "Status",
      mobileLabel: "Status",
      cell: (r) => <StatusBadge status={STATUS_KEY[effectiveStatus(r)]} />,
    },
    {
      key: "periodo",
      header: "Período / Trial",
      mobileLabel: "Vence em",
      cell: (r) => {
        const eff = effectiveStatus(r);
        const endRef = eff === "trial" ? r.trial_ends_at : r.current_period_end;
        return (
          <p className="text-xs text-slate-600">
            {eff === "trial" ? "Trial até " : "Vence em "}
            <span className="font-medium text-slate-800">
              {fmtDate(endRef)}
            </span>
          </p>
        );
      },
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      align: "right",
      cell: (r) => (
        <Link
          href={`/admin/assinaturas/${r.id}`}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-milsaca-cafezal underline-offset-4 hover:underline"
        >
          Gerenciar
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Assinaturas"
        description={`${rows.length} ${rows.length === 1 ? "corretora com assinatura" : "corretoras com assinatura"}. Toda corretora aprovada ganha trial automaticamente.`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Assinaturas" },
        ]}
      />

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        empty={
          <EmptyState
            icon={Receipt}
            title="Nenhuma assinatura ainda"
            description="Toda corretora aprovada ganha um trial de 30 dias automaticamente — quando isso acontecer, a assinatura aparece aqui."
            secondaryCta={{
              label: "Ver corretoras",
              href: "/admin/corretoras",
            }}
          />
        }
      />
    </>
  );
}
