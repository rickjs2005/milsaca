import Link from "next/link";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { Badge } from "@/components/ui/badge";
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
  // corretora
  create_corretora: "Criou corretora",
  update_corretora: "Editou corretora",
  verify_corretora: "Marcou como verificada",
  unverify_corretora: "Tirou verificação",
  aprovar_corretora: "Aprovou cadastro de corretora",
  rejeitar_corretora: "Rejeitou cadastro de corretora",
  link_profile_corretora: "Vinculou perfil a corretora",
  unlink_profile_corretora: "Desvinculou perfil de corretora",
  // plan
  create_plan: "Criou plano",
  update_plan: "Editou plano",
  activate_plan: "Ativou plano",
  deactivate_plan: "Desativou plano",
  // subscription
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

function actionBadge(action: string): {
  label: string;
  className: string;
} {
  const label = ACTION_LABEL[action] ?? action;
  if (
    action.startsWith("rejeitar") ||
    action.startsWith("deactivate") ||
    action.startsWith("unverify") ||
    action.startsWith("subscription_canceled") ||
    action.startsWith("unlink")
  ) {
    return { label, className: "bg-rose-100 text-rose-700 hover:bg-rose-100" };
  }
  if (action.startsWith("update") || action.startsWith("link")) {
    return { label, className: "bg-blue-100 text-blue-700 hover:bg-blue-100" };
  }
  if (
    action.startsWith("create") ||
    action.startsWith("aprovar") ||
    action.startsWith("activate") ||
    action.startsWith("verify") ||
    action.startsWith("subscription_paid")
  ) {
    return {
      label,
      className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    };
  }
  return { label, className: "bg-slate-200 text-slate-700 hover:bg-slate-200" };
}

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
  const rows = (data ?? []) as unknown as Row[];

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Auditoria
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Histórico de ações administrativas e mudanças sensíveis.
          {count != null ? ` ${count} registro${count === 1 ? "" : "s"} no total.` : ""}
        </p>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
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
            placeholder="corretora, plan, subscription, profile..."
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
        {(entity || action || actor) && (
          <Button asChild variant="ghost" className="h-9 text-slate-500">
            <Link href="/admin/auditoria">Limpar</Link>
          </Button>
        )}
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Nenhum evento encontrado com esses filtros.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Quem</th>
                <th className="px-4 py-3">Onde</th>
                <th className="px-4 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const meta = actionBadge(r.action);
                return (
                  <tr key={r.id} className="align-top hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                      {fmtDateTime(r.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={meta.className}>{meta.label}</Badge>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                        {r.action}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {r.profiles?.full_name ?? (
                        <span className="text-slate-400">—</span>
                      )}
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                        {r.actor_id?.slice(0, 8) ?? "sistema"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="font-medium text-slate-700">
                        {r.corretoras?.name ?? (
                          <span className="text-slate-400">—</span>
                        )}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                        {r.entity} {r.entity_id?.slice(0, 8) ?? ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-milsaca-dourado hover:underline">
                          payload
                        </summary>
                        <pre className="mt-1 max-w-md overflow-x-auto rounded bg-slate-50 p-2 font-mono text-[10px] text-slate-700">
                          {JSON.stringify(r.payload, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={buildHref(sp, page - 1)}
                  className="font-medium"
                >
                  ← Anterior
                </Link>
              </Button>
            ) : null}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildHref(sp, page + 1)} className="font-medium">
                  Próxima →
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
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
