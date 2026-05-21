import Link from "next/link";
import { Store } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { fmtDate } from "@/lib/format";
import { toggleCorretoraVerified } from "../_actions";

export const metadata = { title: "Marketplace · Admin Milsaca" };

type Row = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  state: string | null;
  verified: boolean;
  regioes_atendimento: string[] | null;
  created_at: string;
};

/**
 * Marketplace — visão de quem está visível no app público (corretoras
 * verificadas) e quem está oculto/pendente. Reusa toggleCorretoraVerified
 * pra mudar visibilidade. Edição completa continua em /admin/corretoras.
 */
export default async function MarketplacePage() {
  await requireAppAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("corretoras")
    .select(
      "id, name, slug, city, state, verified, regioes_atendimento, created_at",
    )
    .order("verified", { ascending: false })
    .order("name", { ascending: true });

  const rows = (data ?? []) as Row[];
  const visibleCount = rows.filter((r) => r.verified).length;
  const hiddenCount = rows.length - visibleCount;

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Corretora",
      mobileLabel: "Corretora",
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.name}</p>
          <p className="text-xs text-slate-500">
            {[r.city, r.state].filter(Boolean).join(" / ") || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "regioes",
      header: "Regiões atendidas",
      mobileLabel: "Regiões",
      cell: (r) => {
        const list = r.regioes_atendimento ?? [];
        if (list.length === 0)
          return <span className="text-slate-400">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {list.slice(0, 3).map((reg) => (
              <span
                key={reg}
                className="rounded-pill bg-milsaca-dourado/15 px-2 py-0.5 text-[10px] font-medium text-milsaca-cafezal"
              >
                {reg}
              </span>
            ))}
            {list.length > 3 ? (
              <span className="text-[10px] text-slate-500">
                +{list.length - 3}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "visibility",
      header: "Visibilidade",
      mobileLabel: "No catálogo",
      cell: (r) =>
        r.verified ? (
          <StatusBadge status="verificado">No catálogo</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Oculta</StatusBadge>
        ),
    },
    {
      key: "criada",
      header: "Criada",
      cell: (r) => (
        <span className="text-xs text-slate-500">{fmtDate(r.created_at)}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/admin/corretoras/${r.id}`}
            className="text-xs font-medium text-milsaca-cafezal underline-offset-4 hover:underline"
          >
            Editar perfil
          </Link>
          <form action={toggleCorretoraVerified} className="inline">
            <input type="hidden" name="id" value={r.id} />
            <input
              type="hidden"
              name="verified"
              value={r.verified ? "false" : "true"}
            />
            <ConfirmSubmit
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              shouldConfirm={r.verified}
              confirmTitle="Ocultar do catálogo público?"
              confirmMessage={
                <p>
                  <strong>{r.name}</strong> sai do catálogo público
                  imediatamente — produtores deixam de ver no app. Reversível
                  a qualquer momento.
                </p>
              }
              confirmButtonLabel="Ocultar"
              confirmButtonVariant="destructive"
              pendingLabel={r.verified ? "Ocultando..." : "Mostrando..."}
            >
              {r.verified ? "Ocultar" : "Mostrar"}
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
        title="Marketplace"
        description="Controla quem aparece no catálogo público do Milsaca. Verificada = visível pra produtores no app. Oculta = só admin enxerga, não recebe leads novos."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Marketplace" },
        ]}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard
          label="No catálogo"
          value={visibleCount}
          icon={Store}
          tone="success"
          hint="Visíveis pra produtores no app."
        />
        <KpiCard
          label="Ocultas"
          value={hiddenCount}
          tone={hiddenCount > 0 ? "warning" : "default"}
          hint="Cadastradas mas fora do catálogo."
        />
        <KpiCard
          label="Total"
          value={rows.length}
          hint="Corretoras na plataforma."
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        empty={
          <EmptyState
            icon={Store}
            title="Nenhuma corretora cadastrada"
            description="Quando corretoras forem aprovadas, elas aparecem aqui pra controle de visibilidade no catálogo público."
            secondaryCta={{
              label: "Ver aprovações pendentes",
              href: "/admin/aprovacoes",
            }}
          />
        }
      />
    </>
  );
}
