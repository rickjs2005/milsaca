import Link from "next/link";
import { Coffee, Plus } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { toggleCoffeeTypeActive } from "./_actions";

export const metadata = { title: "Tipos de café · Admin Milsaca" };

type Row = {
  id: string;
  slug: string;
  name: string;
  species: string;
  process: string | null;
  default_unit: string;
  active: boolean;
};

const SPECIES_LABEL: Record<string, string> = {
  arabica: "Arábica",
  conilon: "Conilon",
  robusta: "Robusta",
  cacau: "Cacau",
  pimenta: "Pimenta",
  outro: "Outro",
};

const UNIT_LABEL: Record<string, string> = {
  saca_60kg: "Saca 60kg",
  kg: "kg",
  arroba: "Arroba",
  libra: "lb",
  tonelada: "Tonelada",
};

export default async function CoffeeTypesPage() {
  await requireAppAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("coffee_types")
    .select("id, slug, name, species, process, default_unit, active")
    .order("species", { ascending: true })
    .order("name", { ascending: true });

  const rows = (data ?? []) as Row[];

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Nome",
      mobileLabel: "Nome",
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.name}</p>
          <p className="font-mono text-[10px] text-slate-400">{r.slug}</p>
        </div>
      ),
    },
    {
      key: "species",
      header: "Espécie",
      mobileLabel: "Espécie",
      cell: (r) => (
        <span className="text-sm text-slate-700">
          {SPECIES_LABEL[r.species] ?? r.species}
        </span>
      ),
    },
    {
      key: "process",
      header: "Processo",
      cell: (r) =>
        r.process ? (
          <span className="text-xs text-slate-600">{r.process}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
      hideOnMobile: true,
    },
    {
      key: "unit",
      header: "Unidade",
      mobileLabel: "Unidade",
      cell: (r) => UNIT_LABEL[r.default_unit] ?? r.default_unit,
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
            href={`/admin/cotacoes/tipos/${r.id}`}
            className="text-xs font-medium text-milsaca-cafezal underline-offset-4 hover:underline"
          >
            Editar
          </Link>
          <form action={toggleCoffeeTypeActive}>
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
              confirmTitle="Desativar tipo de café?"
              confirmMessage={
                <p>
                  <strong>{r.name}</strong> deixa de aparecer nos formulários
                  de cotação. Cotações existentes que apontam pra esse tipo
                  continuam aparecendo. Reversível.
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
        title="Tipos de café"
        description="Catálogo dos produtos/commodities que podem aparecer em cotações. Adicione novos tipos aqui — eles ficam disponíveis em /admin/cotacoes/nova e no painel da corretora."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Cotações", href: "/admin/cotacoes" },
          { label: "Tipos de café" },
        ]}
        actions={
          <Button
            asChild
            className="bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
          >
            <Link href="/admin/cotacoes/tipos/nova">
              <Plus className="mr-1.5 h-4 w-4" />
              Novo tipo
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
            icon={Coffee}
            title="Nenhum tipo cadastrado"
            description="Crie o primeiro tipo de café pra começar a postar cotações vinculadas."
            cta={{ label: "Criar primeiro tipo", href: "/admin/cotacoes/tipos/nova" }}
          />
        }
      />
    </>
  );
}
