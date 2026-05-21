import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { togglePlanoActive } from "./_actions";

export const metadata = { title: "Planos · Admin Milsaca" };

interface PageProps {
  searchParams: Promise<{ ok?: string; error?: string }>;
}

function formatPrice(cents: number, period: "monthly" | "yearly"): string {
  const reais = (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  return `${reais}/${period === "yearly" ? "ano" : "mês"}`;
}

type Row = {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  billing_period: "monthly" | "yearly";
  features: unknown;
  active: boolean;
};

export default async function PlanosAdminPage({
  searchParams: _searchParams,
}: PageProps) {
  await requireAppAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("plans")
    .select("*")
    .order("active", { ascending: false })
    .order("price_cents", { ascending: true });

  const rows = (data ?? []) as Row[];

  const columns: Column<Row>[] = [
    {
      key: "plano",
      header: "Plano",
      mobileLabel: "Plano",
      cell: (p) => (
        <div>
          <p className="font-medium text-slate-900">{p.name}</p>
          <p className="font-mono text-[10px] text-slate-400">{p.slug}</p>
        </div>
      ),
    },
    {
      key: "preco",
      header: "Preço",
      mobileLabel: "Preço",
      cell: (p) => formatPrice(p.price_cents, p.billing_period),
    },
    {
      key: "features",
      header: "Features",
      cell: (p) => {
        const features = Array.isArray(p.features)
          ? (p.features as string[])
          : [];
        return (
          <span className="text-xs text-slate-500">
            {features.length} {features.length === 1 ? "item" : "itens"}
          </span>
        );
      },
      hideOnMobile: true,
    },
    {
      key: "status",
      header: "Status",
      mobileLabel: "Status",
      cell: (p) =>
        p.active ? (
          <StatusBadge status="ativo" />
        ) : (
          <StatusBadge status="inativo" />
        ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      align: "right",
      cell: (p) => (
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/admin/planos/${p.id}`}
            className="text-xs font-medium text-milsaca-cafezal underline-offset-4 hover:underline"
          >
            Editar
          </Link>
          <form action={togglePlanoActive}>
            <input type="hidden" name="id" value={p.id} />
            <input
              type="hidden"
              name="active"
              value={p.active ? "false" : "true"}
            />
            <ConfirmSubmit
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              shouldConfirm={p.active}
              confirmTitle="Desativar plano?"
              confirmMessage={
                <p>
                  <strong>{p.name}</strong> some do catálogo de planos
                  disponíveis pra venda. Assinaturas existentes nele continuam
                  ativas até o admin trocar.
                </p>
              }
              confirmButtonLabel="Desativar"
              confirmButtonVariant="destructive"
              pendingLabel={p.active ? "Desativando..." : "Ativando..."}
            >
              {p.active ? "Desativar" : "Ativar"}
            </ConfirmSubmit>
          </form>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Planos"
        description={`${rows.length} ${rows.length === 1 ? "plano cadastrado" : "planos cadastrados"}. Edite valores e disponibilidade no catálogo.`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Planos" },
        ]}
        actions={
          <Button
            asChild
            className="bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
          >
            <Link href="/admin/planos/novo">
              <Plus className="mr-1.5 h-4 w-4" />
              Novo plano
            </Link>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(p) => p.id}
        empty={
          <EmptyState
            icon={Wallet}
            title="Nenhum plano cadastrado"
            description="Crie o primeiro plano pra começar a oferecer assinaturas pras corretoras."
            cta={{
              label: "Criar primeiro plano",
              href: "/admin/planos/novo",
            }}
          />
        }
      />
    </>
  );
}
