import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth";
import { listCompradores } from "./_lib/queries";

export const metadata = { title: "Compradores — Milsaca" };

type SearchParams = Promise<{ ok?: string; error?: string }>;

function fmtCnpj(cnpj: string | null): string {
  if (!cnpj || cnpj.length !== 14) return cnpj ?? "—";
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}

export default async function CompradoresPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const { ok, error } = await searchParams;
  const rows = await listCompradores(profile.corretora_id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-milsaca-verde">
            <Building2 className="h-7 w-7" />
            Compradores
          </h1>
          <p className="text-sm text-milsaca-verde-claro">
            Indústrias, exportadores, tradings e torrefadores que compram seu
            café intermediado.
          </p>
        </div>
        <Button
          asChild
          className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
        >
          <Link href="/painel/corretora/compradores/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo comprador
          </Link>
        </Button>
      </header>

      {ok ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {ok}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-milsaca-cream-escuro bg-white p-8 text-center text-sm text-milsaca-verde-claro">
          Nenhum comprador cadastrado.{" "}
          <Link
            href="/painel/corretora/compradores/novo"
            className="text-milsaca-dourado hover:underline"
          >
            Cadastrar o primeiro
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-milsaca-cream-escuro bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-milsaca-cream-escuro/30 text-left text-xs uppercase tracking-wide text-milsaca-verde-claro">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">CNPJ</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-milsaca-verde/5">
                  <td className="px-4 py-3">
                    <p className="font-medium text-milsaca-verde">{c.name}</p>
                    {c.trade_name ? (
                      <p className="text-xs text-milsaca-verde-claro">
                        {c.trade_name}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-milsaca-verde-claro">
                    {fmtCnpj(c.cnpj)}
                  </td>
                  <td className="px-4 py-3 text-milsaca-verde-claro">
                    {c.city ?? "—"}
                    {c.state ? `/${c.state}` : ""}
                  </td>
                  <td className="px-4 py-3 text-milsaca-verde-claro">
                    {c.tipo ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.ativo ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-milsaca-verde-claro">
                        Inativo
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/painel/corretora/compradores/${c.id}`}
                      className="text-xs text-milsaca-dourado hover:underline"
                    >
                      Abrir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
