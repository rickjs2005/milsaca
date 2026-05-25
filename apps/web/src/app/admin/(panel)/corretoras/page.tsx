import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { toggleCorretoraVerified } from "../_actions";

export const metadata = { title: "Corretoras · Admin Milsaca" };

interface PageProps {
  searchParams: Promise<{ ok?: string; error?: string }>;
}

type Row = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  verified: boolean;
  created_at: string;
};

export default async function AdminCorretorasPage({
  searchParams: _searchParams,
}: PageProps) {
  await requireAppAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("corretoras")
    .select("id, name, slug, city, state, phone, verified, created_at")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as Row[];

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Nome",
      mobileLabel: "Nome",
      cell: (c) => (
        <span className="font-medium text-slate-900">{c.name}</span>
      ),
    },
    {
      key: "slug",
      header: "Slug",
      mobileLabel: "Slug",
      cell: (c) => (
        <span className="font-mono text-xs text-slate-500">
          {c.slug ?? "—"}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "cidade",
      header: "Cidade/UF",
      mobileLabel: "Local",
      cell: (c) =>
        [c.city, c.state].filter(Boolean).join(" / ") || (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      mobileLabel: "Status",
      cell: (c) =>
        c.verified ? (
          <StatusBadge status="verificado" />
        ) : (
          <StatusBadge status="pendente" />
        ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      align: "right",
      cell: (c) => (
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/admin/corretoras/${c.id}`}
            className="text-xs font-medium text-milsaca-cafezal underline-offset-4 hover:underline"
          >
            Editar
          </Link>
          <form action={toggleCorretoraVerified} className="inline">
            <input type="hidden" name="id" value={c.id} />
            <input
              type="hidden"
              name="verified"
              value={c.verified ? "false" : "true"}
            />
            <ConfirmSubmit
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs font-medium text-milsaca-dourado hover:bg-transparent hover:underline"
              shouldConfirm={c.verified}
              confirmTitle="Desativar corretora?"
              confirmMessage={
                <p>
                  <strong>{c.name}</strong> sairá do catálogo público (perde o
                  selo de verificada) e o badge vai pra <em>Pendente</em>.
                  Você pode reativar a qualquer momento.
                </p>
              }
              confirmButtonLabel="Desativar"
              confirmButtonVariant="destructive"
              pendingLabel="Desativando..."
            >
              {c.verified ? "Desativar" : "Ativar"}
            </ConfirmSubmit>
          </form>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Gestão"
        title="Corretoras"
        description={`${rows.length} ${rows.length === 1 ? "corretora cadastrada" : "corretoras cadastradas"} na plataforma.`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Corretoras" },
        ]}
        actions={
          <Button
            asChild
            className="bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
          >
            <Link href="/admin/corretoras/nova">
              <Plus className="mr-1.5 h-4 w-4" />
              Nova corretora
            </Link>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(c) => c.id}
        empty={
          <EmptyState
            icon={Building2}
            title="Nenhuma corretora cadastrada"
            description="Cadastre a primeira corretora pra iniciar um tenant na plataforma. Você pode importar via aprovação de cadastro ou criar manualmente."
            cta={{
              label: "Cadastrar primeira corretora",
              href: "/admin/corretoras/nova",
            }}
            secondaryCta={{
              label: "Ver pedidos pendentes",
              href: "/admin/aprovacoes",
            }}
          />
        }
      />
    </>
  );
}
