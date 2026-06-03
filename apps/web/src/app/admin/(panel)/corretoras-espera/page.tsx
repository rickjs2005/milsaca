import { Hourglass } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { SubmitButton } from "@/components/submit-button";
import { fmtDateTime } from "@/lib/format";
import { buildWhatsAppLink } from "@/lib/brasil";
import { setCorretoraWaitlistStatus } from "./_actions";

export const metadata = { title: "Espera de corretora · Admin Milsaca" };

type Status = "aguardando" | "convidada" | "entrou" | "descartada";

type Row = {
  id: string;
  name: string;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  message: string | null;
  status: Status;
  invited_at: string | null;
  created_at: string;
};

const STATUS_TONE: Record<Status, StatusTone> = {
  aguardando: "warning",
  convidada: "info",
  entrou: "success",
  descartada: "neutral",
};

const STATUS_LABEL: Record<Status, string> = {
  aguardando: "Aguardando",
  convidada: "Convidada",
  entrou: "Entrou",
  descartada: "Descartada",
};

export default async function CorretorasEsperaPage() {
  await requireAppAdmin();
  const supabase = await createClient();

  const [{ data: rows }, kpiCounts] = await Promise.all([
    supabase
      .from("corretora_waitlist")
      .select(
        "id, name, whatsapp, email, city, state, message, status, invited_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    Promise.all(
      (["aguardando", "convidada", "entrou", "descartada"] as Status[]).map(
        async (s) => {
          const r = await supabase
            .from("corretora_waitlist")
            .select("*", { count: "exact", head: true })
            .eq("status", s);
          return [s, r.count ?? 0] as const;
        },
      ),
    ),
  ]);

  const counts = Object.fromEntries(kpiCounts) as Record<Status, number>;
  const list = (rows ?? []) as Row[];

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
      key: "nome",
      header: "Nome",
      mobileLabel: "Nome",
      cell: (r) => (
        <div>
          <p className="text-sm font-medium text-slate-900">{r.name}</p>
          {r.email ? (
            <p className="text-[11px] text-slate-500">{r.email}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "contato",
      header: "WhatsApp",
      mobileLabel: "WhatsApp",
      cell: (r) => (
        <span className="font-mono text-xs text-slate-700">
          {r.whatsapp ?? <span className="text-slate-400">—</span>}
        </span>
      ),
    },
    {
      key: "local",
      header: "Cidade / UF",
      mobileLabel: "Cidade",
      cell: (r) => (
        <span className="text-xs text-slate-700">
          {[r.city, r.state].filter(Boolean).join(" / ") || (
            <span className="text-slate-400">—</span>
          )}
        </span>
      ),
      hideOnMobile: true,
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
      key: "message",
      header: "Mensagem",
      cell: (r) =>
        r.message ? (
          <span className="line-clamp-2 text-xs text-slate-600">
            {r.message}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
      hideOnMobile: true,
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      align: "right",
      cell: (r) => {
        if (r.status === "entrou" || r.status === "descartada") {
          return (
            <span className="text-xs text-slate-400">
              {r.invited_at ? fmtDateTime(r.invited_at) : "—"}
            </span>
          );
        }
        const waUrl = buildWhatsAppLink(
          r.whatsapp,
          `Olá ${r.name}! Abriu uma vaga de corretora no Milsaca. Pra ativar seu cadastro, acesse milsaca.app/cadastrar e escolha "Corretora".`,
        );
        return (
          <div className="flex items-center justify-end gap-2">
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 items-center rounded-md border border-success-600/40 px-2 text-[11px] font-medium text-success-700 hover:bg-success-50"
              >
                WhatsApp
              </a>
            ) : null}
            {r.status === "aguardando" ? (
              <form action={setCorretoraWaitlistStatus}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="status" value="convidada" />
                <SubmitButton
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  pendingLabel="..."
                >
                  Convidei
                </SubmitButton>
              </form>
            ) : (
              <form action={setCorretoraWaitlistStatus}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="status" value="entrou" />
                <SubmitButton
                  size="sm"
                  className="h-7 bg-milsaca-cafezal text-[11px] text-milsaca-cream hover:bg-milsaca-folha"
                  pendingLabel="..."
                >
                  Entrou
                </SubmitButton>
              </form>
            )}
            <form action={setCorretoraWaitlistStatus}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="status" value="descartada" />
              <SubmitButton
                size="sm"
                variant="outline"
                className="h-7 text-[11px] text-slate-500"
                pendingLabel="..."
              >
                Descartar
              </SubmitButton>
            </form>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Gestão"
        title="Espera de corretora"
        description="Corretoras interessadas quando o programa de fundadoras está cheio ou fechado. Convide pelo WhatsApp quando abrir vaga e marque o status conforme avança."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Espera de corretora" },
        ]}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Aguardando"
          value={counts.aguardando ?? 0}
          icon={Hourglass}
          tone={(counts.aguardando ?? 0) > 0 ? "warning" : "default"}
          hint="Sem convite ainda."
        />
        <KpiCard label="Convidadas" value={counts.convidada ?? 0} tone="info" />
        <KpiCard label="Entraram" value={counts.entrou ?? 0} tone="success" />
        <KpiCard label="Descartadas" value={counts.descartada ?? 0} />
      </div>

      <DataTable
        columns={columns}
        data={list}
        rowKey={(r) => r.id}
        empty={
          <EmptyState
            icon={Hourglass}
            title="Ninguém na espera"
            description="Quando o programa de fundadoras enche/fecha e alguém tenta se cadastrar como corretora, o contato cai aqui."
            secondaryCta={{ label: "Ajustar vagas", href: "/admin/configuracoes" }}
          />
        }
      />
    </>
  );
}
