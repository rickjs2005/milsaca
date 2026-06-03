import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

type HealthStatus = "ok" | "warn" | "pending";

type CheckRow = {
  label: string;
  status: HealthStatus;
  hint: string;
};

const STATUS_VISUAL: Record<
  HealthStatus,
  { icon: LucideIcon; iconClass: string; chipClass: string; label: string }
> = {
  ok: {
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
    chipClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "OK",
  },
  warn: {
    icon: AlertTriangle,
    iconClass: "text-amber-600",
    chipClass: "bg-amber-50 text-amber-800 ring-amber-200",
    label: "Atenção",
  },
  pending: {
    icon: Circle,
    iconClass: "text-slate-400",
    chipClass: "bg-slate-100 text-slate-600 ring-slate-200",
    label: "Pendente",
  },
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  return `${days}d atrás`;
}

type Props = {
  cotacoesLastSync: string | null;
};

/**
 * Saúde da plataforma — visão rápida do que está funcionando e do que
 * é integração externa ainda não configurada. Pra ser honesto com
 * investidor/cliente, EUDR e Fiscal são marcados como "Pendente"
 * (não como "OK") até que tenhamos provider real plugado.
 *
 * Auth e Banco — se o admin chegou nesta tela, ambos estão OK por
 * construção (RLS + requireAppAdmin já validaram).
 *
 * Cotações — se o último fetched_at em market_quotes é < 36h, OK.
 * Senão, warn (cron parou ou edge function falhando).
 */
export function PlatformHealth({ cotacoesLastSync }: Props) {
  const cotacoesAgeMs = cotacoesLastSync
    ? Date.now() - new Date(cotacoesLastSync).getTime()
    : Infinity;
  const cotacoesOk = cotacoesAgeMs < 36 * 60 * 60 * 1000;

  const checks: CheckRow[] = [
    {
      label: "Autenticação",
      status: "ok",
      hint: "Supabase Auth + MFA admin operacional.",
    },
    {
      label: "Banco de dados",
      status: "ok",
      hint: "RLS ativa em todas as tabelas; migrations versionadas no repo.",
    },
    {
      label: "Cotações",
      status: cotacoesLastSync ? (cotacoesOk ? "ok" : "warn") : "pending",
      hint: cotacoesLastSync
        ? `Última sincronização ${timeAgo(cotacoesLastSync)}.`
        : "Cron sync-cotacoes ainda não rodou.",
    },
    {
      label: "EUDR provider",
      status: "pending",
      hint: "Integração com TRACES/DDS pendente. Roadmap pós-MVP.",
    },
    {
      label: "Fiscal (NFP-e)",
      status: "pending",
      hint: "Provider ainda não contratado.",
    },
  ];

  return (
    <section className="flex flex-col rounded-card border border-slate-200 bg-white p-6 shadow-card">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-milsaca-preto">
            Saúde da plataforma
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Status das integrações críticas.
          </p>
        </div>
      </header>
      <ul className="space-y-3">
        {checks.map((c) => {
          const v = STATUS_VISUAL[c.status];
          const Icon = v.icon;
          return (
            <li key={c.label} className="flex items-start gap-3">
              <Icon
                className={`mt-0.5 h-4 w-4 shrink-0 ${v.iconClass}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">
                    {c.label}
                  </p>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-pill px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset ${v.chipClass}`}
                  >
                    {v.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{c.hint}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
