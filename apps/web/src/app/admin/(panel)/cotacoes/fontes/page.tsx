import { Database, Globe, RefreshCw } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { fmtDateTime } from "@/lib/format";
import { toggleSourceActive } from "./_actions";

export const metadata = { title: "Fontes de cotação · Admin Milsaca" };

type Row = {
  id: string;
  slug: string;
  name: string;
  type: "automatic" | "broker_manual" | "admin_manual" | "external_api" | "mock";
  provider: string | null;
  active: boolean;
  update_frequency: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  notes: string | null;
};

const TYPE_LABEL: Record<Row["type"], string> = {
  automatic: "Automática",
  broker_manual: "Manual (corretora)",
  admin_manual: "Manual (admin)",
  external_api: "API externa",
  mock: "Mock (dev)",
};

const TYPE_TONE: Record<Row["type"], StatusTone> = {
  automatic: "info",
  broker_manual: "premium",
  admin_manual: "premium",
  external_api: "info",
  mock: "warning",
};

function healthTone(r: Row): StatusTone {
  if (!r.active) return "neutral";
  if (r.type !== "automatic") return "success";
  if (r.last_error_at && !r.last_success_at) return "danger";
  if (!r.last_success_at) return "warning";
  const ageMs = Date.now() - new Date(r.last_success_at).getTime();
  if (ageMs > 48 * 3600_000) return "danger";
  if (ageMs > 24 * 3600_000) return "warning";
  return "success";
}

function healthLabel(r: Row): string {
  if (!r.active) return "Inativa";
  if (r.type !== "automatic") return "Pronta";
  if (r.last_error_at && !r.last_success_at) return "Falhando";
  if (!r.last_success_at) return "Sem dados";
  const ageMs = Date.now() - new Date(r.last_success_at).getTime();
  if (ageMs > 48 * 3600_000) return "Crítica";
  if (ageMs > 24 * 3600_000) return "Atrasada";
  return "OK";
}

export default async function FontesPage() {
  await requireAppAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("quote_sources")
    .select(
      "id, slug, name, type, provider, active, update_frequency, last_success_at, last_error_at, last_error_message, notes",
    )
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  const rows = (data ?? []) as Row[];

  const totalActive = rows.filter((r) => r.active).length;
  const totalAutomatic = rows.filter(
    (r) => r.type === "automatic" && r.active,
  ).length;
  const totalErroring = rows.filter(
    (r) => r.type === "automatic" && r.active && r.last_error_at,
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="Compliance · Cotações"
        title="Fontes de cotação"
        description="Catálogo de fontes (automáticas — CEPEA, ICE, BCB — e manuais — admin, corretora). Status mostra última sincronização. Ativar/desativar não apaga histórico, só impede uso futuro."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Cotações", href: "/admin/cotacoes" },
          { label: "Fontes" },
        ]}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Fontes ativas"
          value={totalActive}
          icon={Database}
          tone="success"
        />
        <KpiCard
          label="Automáticas ativas"
          value={totalAutomatic}
          icon={Globe}
          tone="info"
        />
        <KpiCard
          label="Com erro"
          value={totalErroring}
          icon={RefreshCw}
          tone={totalErroring > 0 ? "danger" : "default"}
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-card border border-slate-200 bg-white shadow-card">
          <EmptyState
            icon={Database}
            title="Nenhuma fonte cadastrada"
            description="As fontes são seedadas na migration. Se você está vendo isso, algo deu errado no seed."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rows.map((r) => {
            const hTone = healthTone(r);
            const hLabel = healthLabel(r);
            return (
              <article
                key={r.id}
                className="flex flex-col gap-3 rounded-card border border-slate-200 bg-white p-5 shadow-card"
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-milsaca-preto">
                      {r.name}
                    </p>
                    <p className="font-mono text-[10px] text-slate-400">
                      {r.slug}
                      {r.provider ? ` · ${r.provider}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <StatusBadge tone={TYPE_TONE[r.type]} withDot>
                      {TYPE_LABEL[r.type]}
                    </StatusBadge>
                  </div>
                </header>

                <div className="flex items-center gap-2">
                  <StatusBadge tone={hTone}>{hLabel}</StatusBadge>
                  {r.update_frequency ? (
                    <span className="text-xs text-slate-500">
                      · {r.update_frequency}
                    </span>
                  ) : null}
                </div>

                <dl className="space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-500">Última sync OK</dt>
                    <dd className="font-medium text-slate-700">
                      {r.last_success_at ? fmtDateTime(r.last_success_at) : "—"}
                    </dd>
                  </div>
                  {r.last_error_at ? (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-500">Último erro</dt>
                      <dd className="font-medium text-danger-700">
                        {fmtDateTime(r.last_error_at)}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {r.last_error_message ? (
                  <p className="rounded-md bg-danger-50 px-2 py-1.5 font-mono text-[10px] text-danger-700">
                    {r.last_error_message}
                  </p>
                ) : null}

                {r.notes ? (
                  <p className="text-xs text-slate-600">{r.notes}</p>
                ) : null}

                <footer className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <form action={toggleSourceActive}>
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
                      shouldConfirm={r.active && r.type === "automatic"}
                      confirmTitle="Desativar fonte automática?"
                      confirmMessage={
                        <p>
                          <strong>{r.name}</strong> deixa de ser sincronizada
                          pelo cron sync-cotacoes. Cotações já coletadas
                          permanecem visíveis. Reversível.
                        </p>
                      }
                      confirmButtonLabel="Desativar"
                      confirmButtonVariant="destructive"
                      pendingLabel={r.active ? "Desativando..." : "Ativando..."}
                    >
                      {r.active ? "Desativar" : "Ativar"}
                    </ConfirmSubmit>
                  </form>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
