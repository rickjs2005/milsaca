import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Sprout,
  Wallet,
  Handshake,
  FileSignature,
  Star,
} from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import {
  getProdutorDetalhe,
  listProdutorLeads,
  listProdutorContratos,
} from "../_lib/queries";

export const metadata = { title: "Produtor · Admin Milsaca" };

interface PageProps {
  params: Promise<{ id: string }>;
}

type StatusMeta = { label: string; className: string };
const STATUS_META = {
  ativo: { label: "Ativo", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
  pendente: { label: "Pendente", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  bloqueado: { label: "Bloqueado", className: "bg-rose-100 text-rose-700 hover:bg-rose-100" },
} satisfies Record<string, StatusMeta>;

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

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function fmtMoney(v: number | null): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtCpfCnpj(s: string | null): string {
  if (!s) return "—";
  const d = s.replace(/\D/g, "");
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  return s;
}

function fmtPhone(p: string | null): string {
  if (!p) return "—";
  const d = p.replace(/\D/g, "");
  if (d.length === 13) {
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return p;
}

export default async function ProdutorDetalheAdminPage({ params }: PageProps) {
  await requireAppAdmin();
  const { id } = await params;

  const detalhe = await getProdutorDetalhe(id);
  if (!detalhe) notFound();

  const [leads, contratos] = await Promise.all([
    listProdutorLeads(id, 20),
    listProdutorContratos(id, 20),
  ]);

  const statusMeta = STATUS_META[detalhe.status];

  return (
    <div className="space-y-8">
      <Link
        href="/admin/produtores"
        className="inline-flex items-center gap-1 text-xs text-milsaca-dourado hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Produtores
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {detalhe.full_name ?? "Produtor sem nome"}
          </h1>
          <p className="mt-0.5 font-mono text-[11px] text-slate-500">
            {detalhe.profile_id}
          </p>
        </div>
        <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          icon={Handshake}
          label="Leads"
          value={detalhe.leadsCount}
        />
        <Stat
          icon={FileSignature}
          label="Contratos"
          value={detalhe.contratosCount}
        />
        <Stat
          icon={Star}
          label="Corretoras favoritadas"
          value={detalhe.favoritasCount}
        />
        <Stat
          icon={Wallet}
          label="Preço alvo"
          value={fmtMoney(detalhe.preco_alvo)}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Dados pessoais" icon={Sprout}>
          <Field label="Nome completo" value={detalhe.full_name} />
          <Field label="Telefone" value={fmtPhone(detalhe.phone)} />
          <Field label="WhatsApp" value={fmtPhone(detalhe.whatsapp)} />
          <Field label="CPF/CNPJ" value={fmtCpfCnpj(detalhe.cpf_cnpj)} />
          <Field label="Cadastro em" value={fmtDate(detalhe.created_at)} />
        </Panel>

        <Panel title="Fazenda" icon={MapPin}>
          <Field label="Nome da fazenda" value={detalhe.fazenda_nome} />
          <Field
            label="Localização"
            value={
              [detalhe.city, detalhe.state].filter(Boolean).join("/") || null
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

      <Panel title={`Leads (${leads.length})`} icon={Handshake} compact>
        {leads.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">
            Sem leads registrados.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2">Corretora</th>
                <th className="py-2">Café</th>
                <th className="py-2">Sacas</th>
                <th className="py-2">Preço proposto</th>
                <th className="py-2">Status</th>
                <th className="py-2">Quando</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className="py-2 text-slate-700">
                    {l.corretora?.name ?? "—"}
                  </td>
                  <td className="py-2 text-slate-600">
                    {l.coffee_type ?? "—"}
                  </td>
                  <td className="py-2 text-slate-600">{l.bag_count ?? "—"}</td>
                  <td className="py-2 text-slate-600">
                    {fmtMoney(l.proposed_price)}
                  </td>
                  <td className="py-2 text-xs text-slate-500">
                    {LEAD_STATUS_LABEL[l.status] ?? l.status}
                  </td>
                  <td className="py-2 text-xs text-slate-500">
                    {fmtDate(l.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel
        title={`Contratos (${contratos.length})`}
        icon={FileSignature}
        compact
      >
        {contratos.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">
            Sem contratos.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2">Código</th>
                <th className="py-2">Corretora</th>
                <th className="py-2">Sacas</th>
                <th className="py-2">Valor</th>
                <th className="py-2">Status</th>
                <th className="py-2">Quando</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contratos.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 font-mono text-xs text-slate-700">
                    {c.code}
                  </td>
                  <td className="py-2 text-slate-700">
                    {c.corretora?.name ?? "—"}
                  </td>
                  <td className="py-2 text-slate-600">{c.bag_count ?? "—"}</td>
                  <td className="py-2 text-slate-600">
                    {fmtMoney(c.total_value)}
                  </td>
                  <td className="py-2 text-xs text-slate-500">
                    {CONTRATO_STATUS_LABEL[c.status] ?? c.status}
                  </td>
                  <td className="py-2 text-xs text-slate-500">
                    {fmtDate(c.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <p className="text-center text-xs text-slate-400">
        Esta tela é apenas leitura. Edição de produtor é feita pela própria
        corretora vinculada ou pelo produtor no painel dele.
      </p>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Sprout;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
  compact,
}: {
  title: string;
  icon: typeof Sprout;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-milsaca-dourado" />
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </header>
      {compact ? children : <div className="space-y-2">{children}</div>}
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
    <div className="flex items-center justify-between gap-4 border-b border-slate-50 py-1.5 last:border-0">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-800">
        {value ?? <span className="text-slate-400">—</span>}
      </p>
    </div>
  );
}
