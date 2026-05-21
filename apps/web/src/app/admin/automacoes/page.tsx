import { Cpu, Clock, Play, type LucideIcon } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { SubmitButton } from "@/components/submit-button";
import { fmtDateTime } from "@/lib/format";
import { triggerJob } from "./_actions";

/**
 * Jobs que têm função SQL plugada — recebem botão "Rodar agora".
 * Deve casar com `RUNNABLE` em ./_actions.ts.
 */
const RUNNABLE_KINDS = new Set<string>([
  "cron.expire-trials.run",
  "cron.expire-subscriptions.run",
  "cron.nudge-trial-ending.run",
  "cron.nudge-stale-leads.run",
  "cron.process-dispatches.run",
]);

export const metadata = { title: "Automações · Admin Milsaca" };

/**
 * Catálogo dos jobs automáticos esperados. O kind é o que o sistema
 * grava em `system_events.kind` quando o job roda. Adicione aqui
 * conforme novos jobs forem cadastrados via apply-cron.mjs ou edge
 * functions.
 */
type JobSpec = {
  kind: string;
  label: string;
  schedule: string;
  description: string;
  state: "active" | "pending_setup";
};

const JOBS: JobSpec[] = [
  {
    kind: "cron.sync-cotacoes.run",
    label: "Sincronizar cotações CEPEA",
    schedule: "21:00 UTC · dias úteis",
    description:
      "Coleta cotações de Arábica (CEPEA), Robusta (ICE) e USD/BRL (BCB PTAX). Salva em market_quotes pra leitura no painel.",
    state: "active",
  },
  {
    kind: "cron.expire-trials.run",
    label: "Expirar trials vencidos",
    schedule: "06:00 · diário (pg_cron)",
    description:
      "Marca subscriptions trial cujo trial_ends_at já passou como expired. Função SQL plugada — pode rodar agora.",
    state: "active",
  },
  {
    kind: "cron.expire-subscriptions.run",
    label: "Expirar assinaturas vencidas",
    schedule: "06:15 · diário (pg_cron)",
    description:
      "Marca subscriptions active cujo current_period_end passou como past_due. Função SQL plugada.",
    state: "active",
  },
  {
    kind: "cron.nudge-trial-ending.run",
    label: "Lembrete — trial expirando em 3 dias",
    schedule: "10:00 · diário (pg_cron)",
    description:
      "Cria message_dispatches pendentes do template trial_expira_3d pra corretoras com trial entre +2 e +4 dias.",
    state: "active",
  },
  {
    kind: "cron.nudge-stale-leads.run",
    label: "Lembrete — lead parado há 3 dias",
    schedule: "09:00 BRT · diário (pg_cron)",
    description:
      "Cria message_dispatches pendentes do template lead_parado_3d pra corretoras com lead em_negociacao sem update há 3+ dias.",
    state: "active",
  },
  {
    kind: "cron.process-dispatches.run",
    label: "Worker de envio (placeholder)",
    schedule: "*/15min (pg_cron)",
    description:
      "Marca message_dispatches pendentes como failed com motivo 'no_provider_configured'. Substituir esta função quando o provider real (Meta Cloud / Resend) for plugado.",
    state: "active",
  },
  {
    kind: "cron.nudge-delivery-late.run",
    label: "Lembrete — entrega atrasada",
    schedule: "07:00 · diário",
    description:
      "Notifica corretora quando uma entrega passou da data prevista sem confirmação.",
    state: "pending_setup",
  },
];

type RecentEvent = {
  kind: string;
  status: string;
  error: string | null;
  attempts: number;
  processed_at: string | null;
  created_at: string;
};

function statusTone(status: string): StatusTone {
  if (status === "success") return "success";
  if (status === "failed") return "danger";
  if (status === "processing") return "info";
  if (status === "pending") return "warning";
  if (status === "skipped") return "neutral";
  return "neutral";
}

export default async function AutomacoesPage() {
  await requireAppAdmin();
  const supabase = await createClient();

  // Último evento de cada kind conhecido + últimos 10 failed gerais.
  const [{ data: recentByKind }, { data: recentFailures }, { count: pendingCount }] =
    await Promise.all([
      supabase
        .from("system_events")
        .select("kind, status, error, attempts, processed_at, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("system_events")
        .select("kind, status, error, attempts, processed_at, created_at")
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("system_events")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

  // Reduz pra mapa kind → último evento
  const lastByKind = new Map<string, RecentEvent>();
  for (const r of (recentByKind ?? []) as RecentEvent[]) {
    if (!lastByKind.has(r.kind)) lastByKind.set(r.kind, r);
  }

  const failures = (recentFailures ?? []) as RecentEvent[];

  return (
    <>
      <PageHeader
        eyebrow="Plataforma"
        title="Automações"
        description="Status dos jobs automáticos que mantêm o Milsaca rodando sozinho — cron, lembretes, expiração de trials. Acompanhe falhas em tempo real."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Automações" },
        ]}
      />

      {pendingCount && pendingCount > 0 ? (
        <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>{pendingCount} evento(s) pendente(s)</strong> aguardando worker
          — verifique se o cron está agendado corretamente.
        </p>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Jobs catalogados
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {JOBS.map((job) => {
            const last = lastByKind.get(job.kind) ?? null;
            return (
              <JobCard
                key={job.kind}
                job={job}
                last={last}
                icon={Cpu}
              />
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Falhas recentes
        </h2>
        {failures.length === 0 ? (
          <div className="rounded-card border border-slate-200 bg-white shadow-card">
            <EmptyState
              compact
              icon={Clock}
              title="Nenhuma falha recente"
              description="Quando algum job falhar, ele aparece aqui com erro e contagem de tentativas. Reprocessamento manual chega na Fase 2."
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
            <ul className="divide-y divide-slate-100">
              {failures.map((f, i) => (
                <li key={i} className="space-y-1 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-xs text-slate-700">{f.kind}</p>
                    <StatusBadge tone="danger">
                      {f.attempts} tentativa{f.attempts === 1 ? "" : "s"}
                    </StatusBadge>
                  </div>
                  {f.error ? (
                    <p className="rounded bg-rose-50 px-2 py-1 font-mono text-[11px] text-rose-700">
                      {f.error}
                    </p>
                  ) : null}
                  <p className="text-xs text-slate-500">
                    {fmtDateTime(f.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}

function JobCard({
  job,
  last,
  icon: Icon,
}: {
  job: JobSpec;
  last: RecentEvent | null;
  icon: LucideIcon;
}) {
  const setupNeeded = job.state === "pending_setup";

  return (
    <article className="flex flex-col gap-3 rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-milsaca-dourado/15 text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/30"
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-milsaca-preto">
            {job.label}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{job.schedule}</p>
        </div>
        {setupNeeded ? (
          <StatusBadge tone="warning">Setup pendente</StatusBadge>
        ) : last ? (
          <StatusBadge tone={statusTone(last.status)}>
            {last.status === "success"
              ? "OK"
              : last.status === "failed"
                ? "Falhou"
                : last.status === "processing"
                  ? "Processando"
                  : last.status === "pending"
                    ? "Aguardando"
                    : "Skipped"}
          </StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Nunca rodou</StatusBadge>
        )}
      </header>

      <p className="text-xs text-slate-600">{job.description}</p>

      <footer className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
        <span className="min-w-0 flex-1 truncate text-slate-500">
          {last ? (
            <>
              Última execução:{" "}
              <span className="font-medium text-slate-700">
                {fmtDateTime(last.processed_at ?? last.created_at)}
              </span>
            </>
          ) : setupNeeded ? (
            "Cron ainda não foi agendado no Supabase."
          ) : (
            "Sem registro de execução ainda."
          )}
        </span>
        {RUNNABLE_KINDS.has(job.kind) ? (
          <form action={triggerJob}>
            <input type="hidden" name="kind" value={job.kind} />
            <SubmitButton
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2.5 text-[11px]"
              pendingLabel="Rodando..."
            >
              <Play className="h-3 w-3" />
              Rodar agora
            </SubmitButton>
          </form>
        ) : (
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
            {job.kind}
          </code>
        )}
      </footer>
    </article>
  );
}
