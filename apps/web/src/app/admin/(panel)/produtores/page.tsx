import Link from "next/link";
import { ChevronRight, Sprout } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, type StatusKey } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { Button } from "@/components/ui/button";
import { maskPhoneBR } from "@/lib/mask";
import { fmtDate } from "@/lib/format";
import {
  listProdutores,
  PRODUTORES_PAGE_SIZE,
  type ProdutorListItem,
} from "./_lib/queries";

export const metadata = { title: "Produtores · Admin Milsaca" };

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
  "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
  "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

type SP = {
  q?: string;
  state?: string;
  status?: string;
  page?: string;
};

interface PageProps {
  searchParams: Promise<SP>;
}

export default async function ProdutoresAdminPage({ searchParams }: PageProps) {
  await requireAppAdmin();
  const sp = await searchParams;

  const filters = {
    search: sp.q?.trim() || null,
    state: sp.state?.trim() || null,
    status: sp.status?.trim() || null,
  };
  const page = Math.max(1, Number(sp.page) || 1);

  const { rows, count } = await listProdutores(filters, page);
  const totalPages = Math.max(1, Math.ceil(count / PRODUTORES_PAGE_SIZE));

  const columns: Column<ProdutorListItem>[] = [
    {
      key: "nome",
      header: "Nome",
      mobileLabel: "Nome",
      cell: (r) =>
        r.full_name ? (
          <span className="font-medium text-slate-900">{r.full_name}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: "fazenda",
      header: "Fazenda",
      mobileLabel: "Fazenda",
      cell: (r) =>
        r.fazenda_nome ?? <span className="text-slate-400">—</span>,
      hideOnMobile: true,
    },
    {
      key: "local",
      header: "Cidade/UF",
      mobileLabel: "Local",
      cell: (r) =>
        [r.city, r.state].filter(Boolean).join(" / ") || (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: "telefone",
      header: "Telefone",
      mobileLabel: "Telefone",
      cell: (r) => (
        <span className="font-mono text-xs text-slate-600">
          {maskPhoneBR(r.phone ?? r.whatsapp)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      mobileLabel: "Status",
      cell: (r) => <StatusBadge status={r.status as StatusKey} />,
    },
    {
      key: "cadastro",
      header: "Cadastro",
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
        <Link
          href={`/admin/produtores/${r.profile_id}`}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-milsaca-cafezal underline-offset-4 hover:underline"
        >
          Ver
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Gestão"
        title="Produtores"
        description={`${count} ${count === 1 ? "produtor cadastrado" : "produtores cadastrados"}. Telefones aparecem mascarados na lista — abra o detalhe pra ver completo.`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Produtores" },
        ]}
      />

      <div className="mb-6">
        <FilterBar
          searchParam="q"
          searchPlaceholder="Buscar por nome..."
          resultsLabel={`${count} resultado${count === 1 ? "" : "s"}`}
          filters={[
            {
              param: "state",
              label: "UF",
              options: [
                { value: "", label: "Todas" },
                ...UFS.map((u) => ({ value: u, label: u })),
              ],
            },
            {
              param: "status",
              label: "Status",
              options: [
                { value: "", label: "Todos" },
                { value: "ativo", label: "Ativo" },
                { value: "pendente", label: "Pendente" },
                { value: "bloqueado", label: "Bloqueado" },
              ],
            },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.profile_id}
        empty={
          <EmptyState
            icon={Sprout}
            title="Nenhum produtor encontrado"
            description={
              filters.search || filters.state || filters.status
                ? "Tente ajustar os filtros — talvez a busca esteja restrita demais."
                : "Quando produtores começarem a se cadastrar, eles aparecem aqui."
            }
            secondaryCta={
              filters.search || filters.state || filters.status
                ? { label: "Limpar filtros", href: "/admin/produtores" }
                : undefined
            }
          />
        }
      />

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildHref(sp, page - 1)}>← Anterior</Link>
              </Button>
            ) : null}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildHref(sp, page + 1)}>Próxima →</Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

function buildHref(sp: SP, page: number): string {
  const params = new URLSearchParams();
  if (sp.q) params.set("q", sp.q);
  if (sp.state) params.set("state", sp.state);
  if (sp.status) params.set("status", sp.status);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/produtores?${qs}` : "/admin/produtores";
}
