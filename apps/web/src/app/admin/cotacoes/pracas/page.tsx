import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { togglePracaActive } from "./_actions";

export const metadata = { title: "Praças · Admin Milsaca" };

type Row = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  state: string;
  region_group: string | null;
  active: boolean;
};

export default async function PracasPage() {
  await requireAppAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("pracas")
    .select("id, slug, name, city, state, region_group, active")
    .order("state", { ascending: true })
    .order("name", { ascending: true });

  const rows = (data ?? []) as Row[];

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Praça",
      mobileLabel: "Praça",
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.name}</p>
          <p className="font-mono text-[10px] text-slate-400">{r.slug}</p>
        </div>
      ),
    },
    {
      key: "uf",
      header: "UF",
      mobileLabel: "UF",
      cell: (r) => (
        <span className="font-mono text-sm text-slate-700">{r.state}</span>
      ),
    },
    {
      key: "city",
      header: "Cidade",
      cell: (r) => r.city ?? <span className="text-slate-400">—</span>,
      hideOnMobile: true,
    },
    {
      key: "region",
      header: "Grupo regional",
      mobileLabel: "Região",
      cell: (r) =>
        r.region_group ? (
          <span className="rounded-pill bg-milsaca-dourado/15 px-2 py-0.5 text-[10px] font-medium text-milsaca-cafezal">
            {r.region_group}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
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
            href={`/admin/cotacoes/pracas/${r.id}`}
            className="text-xs font-medium text-milsaca-cafezal underline-offset-4 hover:underline"
          >
            Editar
          </Link>
          <form action={togglePracaActive}>
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
              confirmTitle="Desativar praça?"
              confirmMessage={
                <p>
                  <strong>{r.name}</strong> deixa de aparecer nos formulários
                  de cotação. Cotações existentes ainda mostram. Reversível.
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
        eyebrow="Compliance · Cotações"
        title="Praças"
        description="Catálogo de praças/regiões usadas em cotações. Adicione novas aqui — ficam disponíveis nos formulários de nova cotação e filtros do produtor."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Cotações", href: "/admin/cotacoes" },
          { label: "Praças" },
        ]}
        actions={
          <Button
            asChild
            className="bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
          >
            <Link href="/admin/cotacoes/pracas/nova">
              <Plus className="mr-1.5 h-4 w-4" />
              Nova praça
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
            icon={MapPin}
            title="Nenhuma praça cadastrada"
            description="Crie a primeira praça (ex: Manhuaçu/MG) pra começar a vincular cotações."
            cta={{ label: "Criar primeira praça", href: "/admin/cotacoes/pracas/nova" }}
          />
        }
      />
    </>
  );
}
