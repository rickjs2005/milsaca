import Link from "next/link";
import { ScrollText } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Auditoria · Admin Milsaca" };

const PAGE_SIZE = 50;

type SP = {
  entity?: string;
  action?: string;
  actor?: string;
  page?: string;
};

interface PageProps {
  searchParams: Promise<SP>;
}

const ACTION_LABEL: Record<string, string> = {
  create_corretora: "Criou corretora",
  update_corretora: "Editou corretora",
  verify_corretora: "Marcou como verificada",
  unverify_corretora: "Tirou verificação",
  aprovar_corretora: "Aprovou cadastro de corretora",
  rejeitar_corretora: "Rejeitou cadastro de corretora",
  link_profile_corretora: "Vinculou perfil a corretora",
  unlink_profile_corretora: "Desvinculou perfil de corretora",
  create_plan: "Criou plano",
  update_plan: "Editou plano",
  activate_plan: "Ativou plano",
  deactivate_plan: "Desativou plano",
  update_subscription: "Editou assinatura",
  subscription_paid: "Marcou assinatura como paga",
  subscription_canceled: "Cancelou assinatura",
};

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function actionTone(action: string): StatusTone {
  if (
    action.startsWith("rejeitar") ||
    action.startsWith("deactivate") ||
    action.startsWith("unverify") ||
    action.startsWith("subscription_canceled") ||
    action.startsWith("unlink")
  ) {
    return "danger";
  }
  if (action.startsWith("update") || action.startsWith("link")) return "info";
  if (
    action.startsWith("create") ||
    action.startsWith("aprovar") ||
    action.startsWith("activate") ||
    action.startsWith("verify") ||
    action.startsWith("subscription_paid")
  ) {
    return "success";
  }
  return "neutral";
}

type Row = {
  id: string;
  actor_id: string | null;
  corretora_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  payload: unknown;
  created_at: string;
  profiles: { full_name: string | null } | null;
  corretoras: { name: string } | null;
};

export default async function AuditoriaAdminPage({ searchParams }: PageProps) {
  await requireAppAdmin();
  const sp = await searchParams;
  const supabase = await createClient();

  const entity = sp.entity?.trim() || null;
  const action = sp.action?.trim() || null;
  const actor = sp.actor?.trim() || null;
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("audit_log")
    .select(
      "id, actor_id, corretora_id, action, entity, entity_id, payload, created_at, profiles(full_name), corretoras(name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (entity) query = query.eq("entity", entity);
  if (action) query = query.eq("action", action);
  if (actor) query = query.eq("actor_id", actor);

  const { data, count } = await query;
  const rows = (data ?? []) as unknown as Row[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const hasFilters = Boolean(entity || action || actor);

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
      key: "acao",
      header: "Ação",
      mobileLabel: "Ação",
      cell: (r) => (
        <div>
          <StatusBadge tone={actionTone(r.action)}>
            {ACTION_LABEL[r.action] ?? r.action}
          </StatusBadge>
          <p className="mt-0.5 font-mono text-[10px] text-slate-400">
            {r.action}
          </p>
        </div>
      ),
    },
    {
      key: "quem",
      header: "Quem",
      mobileLabel: "Quem",
      cell: (r) => (
        <div className="text-xs">
          <p className="text-slate-700">
            {r.profiles?.full_name ?? (
              <span className="text-slate-400">—</span>
            )}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-slate-400">
            {r.actor_id?.slice(0, 8) ?? "sistema"}
          </p>
        </div>
      ),
    },
    {
      key: "onde",
      header: "Onde",
      mobileLabel: "Onde",
      cell: (r) => (
        <div className="text-xs">
          <p className="font-medium text-slate-700">
            {r.corretoras?.name ?? <span className="text-slate-400">—</span>}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-slate-400">
            {r.entity} {r.entity_id?.slice(0, 8) ?? ""}
          </p>
        </div>
      ),
    },
    {
      key: "payload",
      header: "Detalhes",
      cell: (r) => (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-milsaca-cafezal underline-offset-4 hover:underline">
            payload
          </summary>
          <pre className="mt-1 max-w-md overflow-x-auto rounded-md bg-slate-50 p-2 font-mono text-[10px] text-slate-700">
            {JSON.stringify(r.payload, null, 2)}
          </pre>
        </details>
      ),
      hideOnMobile: true,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Auditoria"
        description={`Histórico de ações administrativas e mudanças sensíveis.${count != null ? ` ${count} ${count === 1 ? "registro" : "registros"} no total.` : ""}`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Auditoria" },
        ]}
      />

      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-card border border-slate-200 bg-white p-4 shadow-card"
      >
        <div className="space-y-1">
          <label
            htmlFor="entity"
            className="text-[11px] font-medium uppercase tracking-wide text-slate-500"
          >
            Entidade
          </label>
          <Input
            id="entity"
            name="entity"
            defaultValue={entity ?? ""}
            placeholder="corretora, plan, subscription..."
            className="h-9 w-56"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="action"
            className="text-[11px] font-medium uppercase tracking-wide text-slate-500"
          >
            Ação
          </label>
          <Input
            id="action"
            name="action"
            defaultValue={action ?? ""}
            placeholder="create_corretora, update_plan..."
            className="h-9 w-64"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="actor"
            className="text-[11px] font-medium uppercase tracking-wide text-slate-500"
          >
            Quem fez (UUID)
          </label>
          <Input
            id="actor"
            name="actor"
            defaultValue={actor ?? ""}
            placeholder="profile UUID"
            className="h-9 w-64 font-mono text-xs"
          />
        </div>
        <Button type="submit" variant="outline" className="h-9">
          Filtrar
        </Button>
        {hasFilters ? (
          <Button asChild variant="ghost" className="h-9 text-slate-500">
            <Link href="/admin/auditoria">Limpar</Link>
          </Button>
        ) : null}
      </form>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        empty={
          <EmptyState
            icon={ScrollText}
            title={
              hasFilters
                ? "Nenhum evento encontrado com esses filtros"
                : "Sem eventos auditados ainda"
            }
            description={
              hasFilters
                ? "Tente uma combinação diferente — talvez a busca esteja restrita demais."
                : "Ações administrativas (criar/editar/aprovar/desativar) ficam registradas aqui pra rastreabilidade."
            }
            secondaryCta={
              hasFilters
                ? { label: "Limpar filtros", href: "/admin/auditoria" }
                : undefined
            }
          />
        }
      />

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildHref(sp, page - 1)}>← Anterior</Link>
              </Button>
            ) : null}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildHref(sp, page + 1)}>Próxima →</Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

function buildHref(sp: SP, page: number): string {
  const params = new URLSearchParams();
  if (sp.entity) params.set("entity", sp.entity);
  if (sp.action) params.set("action", sp.action);
  if (sp.actor) params.set("actor", sp.actor);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/auditoria?${qs}` : "/admin/auditoria";
}
