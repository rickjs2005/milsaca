import Link from "next/link";
import { Filter, Plus } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { toggleRuleActive } from "./_actions";

export const metadata = { title: "Regras de leads · Admin Milsaca" };

type Row = {
  id: string;
  name: string;
  priority: number;
  action: "match" | "skip" | "fallback_support";
  conditions: unknown;
  active: boolean;
  notes: string | null;
};

const ACTION_LABEL: Record<Row["action"], string> = {
  match: "Match",
  skip: "Bloqueia",
  fallback_support: "Fallback",
};

const ACTION_TONE: Record<Row["action"], StatusTone> = {
  match: "success",
  skip: "danger",
  fallback_support: "warning",
};

export default async function RegrasLeadsPage() {
  await requireAppAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("lead_distribution_rules")
    .select("id, name, priority, action, conditions, active, notes")
    .order("priority", { ascending: true });

  const rows = (data ?? []) as Row[];

  const columns: Column<Row>[] = [
    {
      key: "priority",
      header: "#",
      mobileLabel: "Prioridade",
      cell: (r) => (
        <span className="font-mono text-xs text-slate-600">{r.priority}</span>
      ),
    },
    {
      key: "name",
      header: "Regra",
      mobileLabel: "Regra",
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.name}</p>
          {r.notes ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
              {r.notes}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "action",
      header: "Ação",
      mobileLabel: "Ação",
      cell: (r) => (
        <StatusBadge tone={ACTION_TONE[r.action]}>
          {ACTION_LABEL[r.action]}
        </StatusBadge>
      ),
    },
    {
      key: "active",
      header: "Status",
      mobileLabel: "Status",
      cell: (r) =>
        r.active ? (
          <StatusBadge status="ativo" />
        ) : (
          <StatusBadge status="inativo" />
        ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/admin/regras-leads/${r.id}`}
            className="text-xs font-medium text-milsaca-cafezal underline-offset-4 hover:underline"
          >
            Editar
          </Link>
          <form action={toggleRuleActive}>
            <input type="hidden" name="id" value={r.id} />
            <input
              type="hidden"
              name="active"
              value={r.active ? "false" : "true"}
            />
            <ConfirmSubmit
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              shouldConfirm={r.active}
              confirmTitle="Desativar regra?"
              confirmMessage={
                <p>
                  <strong>{r.name}</strong> deixa de avaliar leads novos. Regras
                  com prioridade depois assumem. Reversível.
                </p>
              }
              confirmButtonLabel="Desativar"
              confirmButtonVariant="destructive"
              pendingLabel={r.active ? "Desativando..." : "Ativando..."}
            >
              {r.active ? "Desativar" : "Ativar"}
            </ConfirmSubmit>
          </form>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Plataforma"
        title="Regras de leads"
        description="Define como leads de produtor são distribuídos pras corretoras. Regras avaliadas em ordem de prioridade (menor primeiro). Aplicação real chega na Fase 2 — esta tela já cataloga e versiona."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Regras de leads" },
        ]}
        actions={
          <Button
            asChild
            className="bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
          >
            <Link href="/admin/regras-leads/nova">
              <Plus className="mr-1.5 h-4 w-4" />
              Nova regra
            </Link>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        empty={
          <EmptyState
            icon={Filter}
            title="Nenhuma regra cadastrada"
            description="Crie a primeira regra pra começar a distribuir leads automaticamente. Sugestão: comece pela regra de bloqueio (corretora vencida)."
            cta={{
              label: "Criar primeira regra",
              href: "/admin/regras-leads/nova",
            }}
          />
        }
      />
    </>
  );
}
