import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Inbox,
  ScrollText,
  ShieldOff,
  UserPlus,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@milsaca/db/web/server";

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
  payload: Record<string, unknown>;
  corretora: { name: string } | null;
  actor: { full_name: string | null; email?: string | null } | null;
};

const FALLBACK: { icon: LucideIcon; tone: string } = {
  icon: ScrollText,
  tone: "bg-neutral-100 text-neutral-600",
};

/**
 * Mapeia (action, entity) → ícone + label humano + tom de cor.
 * Mantém microcopy curto. Eventos não-mapeados caem no FALLBACK.
 */
const EVENT_MAP: Record<
  string,
  { icon: LucideIcon; tone: string; label: (r: AuditRow) => string; href?: (r: AuditRow) => string }
> = {
  "create:corretora": {
    icon: Building2,
    tone: "bg-milsaca-dourado/15 text-milsaca-cafezal",
    label: (r) => `Corretora "${r.corretora?.name ?? "—"}" criada`,
    href: (r) => `/admin/corretoras/${r.entity_id ?? ""}`,
  },
  "update:corretora": {
    icon: Building2,
    tone: "bg-info-50 text-info-700",
    label: (r) => `Corretora "${r.corretora?.name ?? "—"}" atualizada`,
    href: (r) => `/admin/corretoras/${r.entity_id ?? ""}`,
  },
  "toggle:corretora": {
    icon: Building2,
    tone: "bg-warning-50 text-warning-700",
    label: (r) =>
      `Corretora "${r.corretora?.name ?? "—"}" ${(r.payload?.active ? "ativada" : "desativada")}`,
  },
  "approve:corretora": {
    icon: CheckCircle2,
    tone: "bg-success-50 text-success-700",
    label: (r) => `Corretora aprovada — "${r.corretora?.name ?? "—"}"`,
  },
  "reject:signup": {
    icon: XCircle,
    tone: "bg-danger-50 text-danger-700",
    label: () => `Cadastro de corretora rejeitado`,
  },
  "create:plan": {
    icon: Wallet,
    tone: "bg-success-50 text-success-700",
    label: () => "Novo plano cadastrado",
    href: () => "/admin/planos",
  },
  "update:plan": {
    icon: Wallet,
    tone: "bg-info-50 text-info-700",
    label: () => "Plano atualizado",
    href: () => "/admin/planos",
  },
  "toggle:plan": {
    icon: Wallet,
    tone: "bg-warning-50 text-warning-700",
    label: (r) =>
      `Plano ${r.payload?.active ? "ativado" : "desativado"}`,
    href: () => "/admin/planos",
  },
  "link:profile": {
    icon: UserPlus,
    tone: "bg-info-50 text-info-700",
    label: () => "Operador vinculado à corretora",
  },
  "block:profile": {
    icon: ShieldOff,
    tone: "bg-danger-50 text-danger-700",
    label: () => "Acesso bloqueado",
  },
};

function keyOf(r: AuditRow): string {
  return `${r.action}:${r.entity}`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

/**
 * Feed de últimos eventos administrativos lendo do `audit_log`.
 * Server component — usa Supabase server client. Sem fallback inventado:
 * se está vazio, mostra estado honesto.
 */
export async function ActivityFeed() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select(
      "id, action, entity, entity_id, created_at, payload, corretora:corretoras(name), actor:profiles(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(8);

  const rows = ((data ?? []) as unknown as AuditRow[]) ?? [];

  return (
    <section className="flex flex-col rounded-card border border-neutral-200 bg-white p-6 shadow-card">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-milsaca-preto">
            Atividade recente
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Últimas ações registradas no sistema.
          </p>
        </div>
        <Link
          href="/admin/auditoria"
          className="text-xs font-medium text-milsaca-cafezal hover:underline underline-offset-4"
        >
          Ver tudo →
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
            <Inbox className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-neutral-700">
            Nada por aqui ainda
          </p>
          <p className="max-w-xs text-xs text-neutral-500">
            Ações administrativas (criar/editar/aprovar) aparecem aqui assim
            que acontecerem.
          </p>
        </div>
      ) : (
        <ul className="-mx-2 divide-y divide-neutral-100">
          {rows.map((r) => {
            const m = EVENT_MAP[keyOf(r)] ?? null;
            const Icon = (m?.icon ?? FALLBACK.icon) as LucideIcon;
            const tone = m?.tone ?? FALLBACK.tone;
            const label = m?.label?.(r) ?? `${r.action} / ${r.entity}`;
            const href = m?.href?.(r);
            const actor = r.actor?.full_name ?? "Sistema";
            const inner = (
              <div className="flex items-start gap-3 px-2 py-3">
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {label}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    por {actor} · {timeAgo(r.created_at)}
                  </p>
                </div>
              </div>
            );
            return (
              <li key={r.id}>
                {href ? (
                  <Link
                    href={href}
                    className="block rounded-md transition-colors hover:bg-milsaca-cream/60"
                  >
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
