import Link from "next/link";
import { requireAppAdmin } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  listProdutores,
  PRODUTORES_PAGE_SIZE,
} from "./_lib/queries";

export const metadata = { title: "Produtores · Admin Milsaca" };

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
  "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
  "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

type SP = {
  search?: string;
  state?: string;
  status?: string;
  page?: string;
};

interface PageProps {
  searchParams: Promise<SP>;
}

type StatusMeta = { label: string; className: string };
const STATUS_META = {
  ativo: { label: "Ativo", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
  pendente: { label: "Pendente", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  bloqueado: { label: "Bloqueado", className: "bg-rose-100 text-rose-700 hover:bg-rose-100" },
} satisfies Record<string, StatusMeta>;

function maskPhone(p: string | null): string {
  if (!p) return "—";
  const d = p.replace(/\D/g, "");
  if (d.length < 10) return p;
  // (XX) X****-XXXX
  const ddd = d.slice(-11, -9);
  const last4 = d.slice(-4);
  return `(${ddd}) *****-${last4}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

export default async function ProdutoresAdminPage({ searchParams }: PageProps) {
  await requireAppAdmin();
  const sp = await searchParams;

  const filters = {
    search: sp.search?.trim() || null,
    state: sp.state?.trim() || null,
    status: sp.status?.trim() || null,
  };
  const page = Math.max(1, Number(sp.page) || 1);

  const { rows, count } = await listProdutores(filters, page);
  const totalPages = Math.max(1, Math.ceil(count / PRODUTORES_PAGE_SIZE));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Produtores
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {count} produtor{count === 1 ? "" : "es"} cadastrado{count === 1 ? "" : "s"}.
          Telefones mascarados na lista; abra o detalhe pra ver completo.
        </p>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="space-y-1">
          <label
            htmlFor="search"
            className="text-[11px] font-medium uppercase tracking-wide text-slate-500"
          >
            Nome
          </label>
          <Input
            id="search"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="João..."
            className="h-9 w-64"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="state"
            className="text-[11px] font-medium uppercase tracking-wide text-slate-500"
          >
            UF
          </label>
          <select
            id="state"
            name="state"
            defaultValue={filters.state ?? ""}
            className="flex h-9 w-24 rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm"
          >
            <option value="">Todas</option>
            {UFS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="status"
            className="text-[11px] font-medium uppercase tracking-wide text-slate-500"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={filters.status ?? ""}
            className="flex h-9 w-36 rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm"
          >
            <option value="">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="pendente">Pendente</option>
            <option value="bloqueado">Bloqueado</option>
          </select>
        </div>
        <Button type="submit" variant="outline" className="h-9">
          Filtrar
        </Button>
        {(filters.search || filters.state || filters.status) && (
          <Button asChild variant="ghost" className="h-9 text-slate-500">
            <Link href="/admin/produtores">Limpar</Link>
          </Button>
        )}
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Nenhum produtor encontrado.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Fazenda</th>
                <th className="px-4 py-3">Cidade/UF</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Cadastro</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const meta = STATUS_META[r.status];
                return (
                  <tr key={r.profile_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {r.full_name ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.fazenda_nome ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {[r.city, r.state].filter(Boolean).join("/") || (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {maskPhone(r.phone ?? r.whatsapp)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={meta.className}>{meta.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {fmtDate(r.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/produtores/${r.profile_id}`}
                        className="text-xs font-medium text-milsaca-dourado hover:underline"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-600">
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
    </div>
  );
}

function buildHref(sp: SP, page: number): string {
  const params = new URLSearchParams();
  if (sp.search) params.set("search", sp.search);
  if (sp.state) params.set("state", sp.state);
  if (sp.status) params.set("status", sp.status);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/produtores?${qs}` : "/admin/produtores";
}
