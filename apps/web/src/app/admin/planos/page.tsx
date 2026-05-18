import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default async function PlanosAdminPage({ searchParams }: PageProps) {
  await requireAppAdmin();
  const { ok, error } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("plans")
    .select("*")
    .order("active", { ascending: false })
    .order("price_cents", { ascending: true });

  const rows = data ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Planos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} cadastrado{rows.length === 1 ? "" : "s"}. Editar valores e disponibilidade.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/planos/novo" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Novo plano
          </Link>
        </Button>
      </div>

      {ok ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {ok}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3">Features</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((p) => {
              const features = Array.isArray(p.features)
                ? (p.features as string[])
                : [];
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{p.name}</p>
                    <p className="font-mono text-[10px] text-slate-400">{p.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatPrice(p.price_cents, p.billing_period)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {features.length} {features.length === 1 ? "item" : "itens"}
                  </td>
                  <td className="px-4 py-3">
                    {p.active ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500">
                        Inativo
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/planos/${p.id}`}
                        className="text-xs font-medium text-milsaca-dourado hover:underline"
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
                        <Button
                          variant="outline"
                          size="sm"
                          type="submit"
                          className="h-7 text-xs"
                        >
                          {p.active ? "Desativar" : "Ativar"}
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                  Nenhum plano cadastrado.{" "}
                  <Link
                    href="/admin/planos/novo"
                    className="text-milsaca-dourado hover:underline"
                  >
                    Criar o primeiro
                  </Link>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
