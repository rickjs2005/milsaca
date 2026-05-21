import { Mail, MessageSquare, Send } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "Comunicação · Admin Milsaca" };

type Template = {
  id: string;
  channel: "whatsapp" | "email";
  kind: string;
  name: string;
  active: boolean;
  variables: unknown;
};

type Dispatch = {
  id: string;
  template_id: string | null;
  channel: string;
  recipient: string;
  status: "pending" | "sent" | "failed" | "retried";
  error: string | null;
  sent_at: string | null;
  created_at: string;
};

const DISPATCH_STATUS_TONE: Record<Dispatch["status"], StatusTone> = {
  pending: "warning",
  sent: "success",
  failed: "danger",
  retried: "info",
};

const DISPATCH_STATUS_LABEL: Record<Dispatch["status"], string> = {
  pending: "Pendente",
  sent: "Enviado",
  failed: "Falhou",
  retried: "Retentado",
};

function maskRecipient(channel: string, recipient: string): string {
  if (channel === "email") {
    const [user, domain] = recipient.split("@");
    if (!user || !domain) return recipient;
    const masked =
      user.length <= 3 ? `${user[0] ?? ""}***` : `${user.slice(0, 3)}***`;
    return `${masked}@${domain}`;
  }
  // whatsapp — mostra DDD + últimos 4
  const d = recipient.replace(/\D/g, "");
  if (d.length < 10) return recipient;
  const noCountry = d.length === 13 ? d.slice(2) : d;
  return `(${noCountry.slice(0, 2)}) *****-${noCountry.slice(-4)}`;
}

export default async function ComunicacaoPage() {
  await requireAppAdmin();
  const supabase = await createClient();

  const [
    { data: templates },
    { data: recentDispatches },
    { count: totalSent },
    { count: totalFailed },
    { count: totalPending },
  ] = await Promise.all([
    supabase
      .from("notification_templates")
      .select("id, channel, kind, name, active, variables")
      .order("channel", { ascending: true })
      .order("kind", { ascending: true }),
    supabase
      .from("message_dispatches")
      .select("id, template_id, channel, recipient, status, error, sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("message_dispatches")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent"),
    supabase
      .from("message_dispatches")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase
      .from("message_dispatches")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const tpls = (templates ?? []) as Template[];
  const dispatches = (recentDispatches ?? []) as Dispatch[];
  const deliveryRate =
    (totalSent ?? 0) + (totalFailed ?? 0) > 0
      ? ((totalSent ?? 0) /
          ((totalSent ?? 0) + (totalFailed ?? 0))) *
        100
      : 0;

  const dispatchColumns: Column<Dispatch>[] = [
    {
      key: "quando",
      header: "Quando",
      mobileLabel: "Quando",
      cell: (d) => (
        <span className="whitespace-nowrap text-xs text-slate-600">
          {fmtDateTime(d.sent_at ?? d.created_at)}
        </span>
      ),
    },
    {
      key: "canal",
      header: "Canal",
      mobileLabel: "Canal",
      cell: (d) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
          {d.channel === "email" ? (
            <Mail className="h-3.5 w-3.5 text-sky-600" />
          ) : (
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
          )}
          {d.channel}
        </span>
      ),
    },
    {
      key: "destinatario",
      header: "Destinatário",
      mobileLabel: "Destinatário",
      cell: (d) => (
        <span className="font-mono text-xs text-slate-700">
          {maskRecipient(d.channel, d.recipient)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      mobileLabel: "Status",
      cell: (d) => (
        <StatusBadge tone={DISPATCH_STATUS_TONE[d.status]}>
          {DISPATCH_STATUS_LABEL[d.status]}
        </StatusBadge>
      ),
    },
    {
      key: "erro",
      header: "Erro",
      cell: (d) =>
        d.error ? (
          <span className="line-clamp-1 font-mono text-[11px] text-rose-700">
            {d.error}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
      hideOnMobile: true,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Plataforma"
        title="Comunicação"
        description="Templates de WhatsApp e e-mail + histórico de envios. Quando o provider real estiver plugado (Fase 2), todas as mensagens passam por aqui pra log e métricas."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Comunicação" },
        ]}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Enviadas"
          value={totalSent ?? 0}
          icon={Send}
          tone="success"
        />
        <KpiCard
          label="Falharam"
          value={totalFailed ?? 0}
          tone={totalFailed && totalFailed > 0 ? "danger" : "default"}
        />
        <KpiCard
          label="Pendentes"
          value={totalPending ?? 0}
          tone={totalPending && totalPending > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Taxa de entrega"
          value={`${deliveryRate.toFixed(1)}%`}
          tone="premium"
          hint="sent / (sent + failed)"
        />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Templates ({tpls.length})
        </h2>
        {tpls.length === 0 ? (
          <div className="rounded-card border border-slate-200 bg-white shadow-card">
            <EmptyState
              compact
              icon={Mail}
              title="Nenhum template ainda"
              description="Templates ficam em notification_templates. Adicione via migration ou direto no banco."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {tpls.map((t) => (
              <article
                key={t.id}
                className="flex flex-col gap-2 rounded-card border border-slate-200 bg-white p-5 shadow-card"
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {t.channel === "email" ? (
                      <Mail className="h-4 w-4 text-sky-600" />
                    ) : (
                      <MessageSquare className="h-4 w-4 text-emerald-600" />
                    )}
                    <p className="text-sm font-semibold text-milsaca-preto">
                      {t.name}
                    </p>
                  </div>
                  {t.active ? (
                    <StatusBadge status="ativo" />
                  ) : (
                    <StatusBadge status="inativo" />
                  )}
                </header>
                <p className="font-mono text-[11px] text-slate-500">
                  {t.channel}:{t.kind}
                </p>
                <p className="text-xs text-slate-600">
                  Variáveis:{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">
                    {Array.isArray(t.variables) && t.variables.length > 0
                      ? (t.variables as string[]).join(", ")
                      : "—"}
                  </code>
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Envios recentes (últimos 20)
        </h2>
        <DataTable
          columns={dispatchColumns}
          data={dispatches}
          rowKey={(d) => d.id}
          empty={
            <EmptyState
              compact
              icon={Send}
              title="Nenhum envio registrado ainda"
              description="Quando o sistema disparar mensagem (lead novo, trial expirando, etc), o despacho aparece aqui com status e erro se houver."
            />
          }
        />
      </section>
    </>
  );
}
