import { notFound } from "next/navigation";
import {
  MapPin,
  Sprout,
  Wallet,
  Handshake,
  FileSignature,
  Star,
  type LucideIcon,
} from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, type StatusKey } from "@/components/status-badge";
import { KpiCard } from "@/components/kpi-card";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { formatCpfCnpj } from "@/lib/mask";
import { formatPhoneBR } from "@/lib/brasil";
import { fmtDate, fmtMoney } from "@/lib/format";
import {
  getProdutorDetalhe,
  listProdutorLeads,
  listProdutorContratos,
} from "../_lib/queries";

export const metadata = { title: "Produtor · Admin Milsaca" };

interface PageProps {
  params: Promise<{ id: string }>;
}

const LEAD_STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  em_negociacao: "Em negociação",
  convertido: "Convertido",
  perdido: "Perdido",
  arquivado: "Arquivado",
};

const CONTRATO_STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  em_analise: "Em análise",
  ativo: "Ativo",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

function fmtPhone(p: string | null): string {
  if (!p) return "—";
  return formatPhoneBR(p) || p;
}

type LeadRow = {
  id: string;
  status: string;
  coffee_type: string | null;
  bag_count: number | null;
  proposed_price: number | null;
  created_at: string;
  corretora: { name: string } | null;
};

type ContratoRow = {
  id: string;
  code: string;
  status: string;
  bag_count: number | null;
  total_value: number | null;
  created_at: string;
  corretora: { name: string } | null;
};

export default async function ProdutorDetalheAdminPage({ params }: PageProps) {
  await requireAppAdmin();
  const { id } = await params;

  const detalhe = await getProdutorDetalhe(id);
  if (!detalhe) notFound();

  const [leads, contratos] = await Promise.all([
    listProdutorLeads(id, 20),
    listProdutorContratos(id, 20),
  ]);

  const leadColumns: Column<LeadRow>[] = [
    {
      key: "corretora",
      header: "Corretora",
      mobileLabel: "Corretora",
      cell: (l) => l.corretora?.name ?? "—",
    },
    {
      key: "cafe",
      header: "Café",
      mobileLabel: "Café",
      cell: (l) => l.coffee_type ?? "—",
    },
    {
      key: "sacas",
      header: "Sacas",
      mobileLabel: "Sacas",
      cell: (l) => l.bag_count ?? "—",
    },
    {
      key: "preco",
      header: "Preço proposto",
      mobileLabel: "Preço",
      cell: (l) => fmtMoney(l.proposed_price),
    },
    {
      key: "status",
      header: "Status",
      mobileLabel: "Status",
      cell: (l) => (
        <span className="text-xs text-slate-600">
          {LEAD_STATUS_LABEL[l.status] ?? l.status}
        </span>
      ),
    },
    {
      key: "quando",
      header: "Quando",
      cell: (l) => (
        <span className="text-xs text-slate-500">{fmtDate(l.created_at)}</span>
      ),
      hideOnMobile: true,
    },
  ];

  const contratoColumns: Column<ContratoRow>[] = [
    {
      key: "code",
      header: "Código",
      mobileLabel: "Código",
      cell: (c) => (
        <span className="font-mono text-xs text-slate-700">{c.code}</span>
      ),
    },
    {
      key: "corretora",
      header: "Corretora",
      mobileLabel: "Corretora",
      cell: (c) => c.corretora?.name ?? "—",
    },
    {
      key: "sacas",
      header: "Sacas",
      mobileLabel: "Sacas",
      cell: (c) => c.bag_count ?? "—",
    },
    {
      key: "valor",
      header: "Valor",
      mobileLabel: "Valor",
      cell: (c) => fmtMoney(c.total_value),
    },
    {
      key: "status",
      header: "Status",
      mobileLabel: "Status",
      cell: (c) => (
        <span className="text-xs text-slate-600">
          {CONTRATO_STATUS_LABEL[c.status] ?? c.status}
        </span>
      ),
    },
    {
      key: "quando",
      header: "Quando",
      cell: (c) => (
        <span className="text-xs text-slate-500">{fmtDate(c.created_at)}</span>
      ),
      hideOnMobile: true,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={`ID · ${detalhe.profile_id.slice(0, 8)}`}
        title={detalhe.full_name ?? "Produtor sem nome"}
        description="Visão completa do produtor — read-only. Edição é feita pelo próprio produtor ou pela corretora vinculada."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Produtores", href: "/admin/produtores" },
          { label: detalhe.full_name ?? "Detalhe" },
        ]}
        actions={<StatusBadge status={detalhe.status as StatusKey} />}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Leads" value={detalhe.leadsCount} icon={Handshake} />
        <KpiCard
          label="Contratos"
          value={detalhe.contratosCount}
          icon={FileSignature}
        />
        <KpiCard
          label="Corretoras favoritas"
          value={detalhe.favoritasCount}
          icon={Star}
          tone="premium"
        />
        <KpiCard
          label="Preço alvo"
          value={fmtMoney(detalhe.preco_alvo)}
          icon={Wallet}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Dados pessoais" icon={Sprout}>
          <Field label="Nome completo" value={detalhe.full_name} />
          <Field label="Telefone" value={fmtPhone(detalhe.phone)} />
          <Field label="WhatsApp" value={fmtPhone(detalhe.whatsapp)} />
          <Field label="CPF/CNPJ" value={formatCpfCnpj(detalhe.cpf_cnpj)} />
          <Field label="Cadastro em" value={fmtDate(detalhe.created_at)} />
        </Panel>

        <Panel title="Fazenda" icon={MapPin}>
          <Field label="Nome da fazenda" value={detalhe.fazenda_nome} />
          <Field
            label="Localização"
            value={
              [detalhe.city, detalhe.state].filter(Boolean).join(" / ") || null
            }
          />
          <Field
            label="Área"
            value={detalhe.area_ha != null ? `${detalhe.area_ha} ha` : null}
          />
          <Field
            label="Altitude"
            value={
              detalhe.altitude_m != null ? `${detalhe.altitude_m} m` : null
            }
          />
          <Field
            label="Espécie"
            value={
              detalhe.specie === "arabica"
                ? "Arábica"
                : detalhe.specie === "conilon"
                  ? "Conillon"
                  : detalhe.specie === "ambos"
                    ? "Arábica + Conillon"
                    : null
            }
          />
        </Panel>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-milsaca-preto">
          <Handshake className="h-4 w-4 text-milsaca-dourado-texto" />
          Leads ({leads.length})
        </h2>
        <DataTable
          columns={leadColumns}
          data={leads as LeadRow[]}
          rowKey={(l) => l.id}
          empty={
            <EmptyState
              compact
              icon={Handshake}
              title="Sem leads registrados"
              description="Quando uma corretora abrir uma negociação com esse produtor, o lead aparece aqui."
            />
          }
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-milsaca-preto">
          <FileSignature className="h-4 w-4 text-milsaca-dourado-texto" />
          Contratos ({contratos.length})
        </h2>
        <DataTable
          columns={contratoColumns}
          data={contratos as ContratoRow[]}
          rowKey={(c) => c.id}
          empty={
            <EmptyState
              compact
              icon={FileSignature}
              title="Sem contratos"
              description="Contratos assinados pela corretora pra esse produtor vão aparecer aqui."
            />
          }
        />
      </section>

      <p className="text-center text-xs text-slate-400">
        Esta tela é apenas leitura. Edição de produtor é feita pela própria
        corretora vinculada ou pelo produtor no painel dele.
      </p>
    </>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-slate-200 bg-white p-6 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-milsaca-dourado-texto" />
        <h2 className="text-base font-semibold text-milsaca-preto">{title}</h2>
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-1.5 last:border-0">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-800">
        {value ?? <span className="text-slate-400">—</span>}
      </p>
    </div>
  );
}
