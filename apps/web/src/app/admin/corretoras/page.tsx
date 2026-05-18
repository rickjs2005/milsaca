import Link from "next/link";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "../_components/confirm-submit";
import { toggleCorretoraVerified } from "../_actions";

export const metadata = { title: "Corretoras · Admin Milsaca" };

interface PageProps {
  searchParams: Promise<{ ok?: string; error?: string }>;
}

export default async function AdminCorretorasPage({ searchParams }: PageProps) {
  await requireAppAdmin();
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("corretoras")
    .select("id, name, slug, city, state, phone, verified, created_at")
    .order("created_at", { ascending: false });

  const rows = data ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin"
            className="text-xs text-milsaca-dourado hover:underline"
          >
            ← Admin
          </Link>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-milsaca-verde">
            Corretoras
          </h1>
          <p className="mt-1 text-sm text-milsaca-verde-claro">
            {rows.length} cadastrada{rows.length === 1 ? "" : "s"}.
          </p>
        </div>
        <Button
          asChild
          className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
        >
          <Link href="/admin/corretoras/nova">+ Nova corretora</Link>
        </Button>
      </div>

      {ok ? (
        <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {ok}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="mt-8 overflow-hidden rounded-2xl border border-milsaca-verde/10 bg-white shadow-sm">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-milsaca-verde-claro">
            Nenhuma corretora cadastrada. Crie a primeira.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-milsaca-cream-escuro/30 text-left text-xs uppercase tracking-wide text-milsaca-verde-claro">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Cidade/UF</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-milsaca-verde/5">
                  <td className="px-4 py-3 font-medium text-milsaca-verde">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-milsaca-verde-claro">
                    {c.slug}
                  </td>
                  <td className="px-4 py-3 text-milsaca-verde-claro">
                    {[c.city, c.state].filter(Boolean).join("/") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.verified ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        Verificada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-milsaca-verde-claro">
                        Pendente
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/corretoras/${c.id}`}
                        className="text-xs text-milsaca-verde-claro underline-offset-2 hover:text-milsaca-verde hover:underline"
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
                          className="h-auto p-0 text-xs text-milsaca-dourado hover:bg-transparent hover:underline"
                          shouldConfirm={c.verified}
                          confirmTitle="Desativar corretora?"
                          confirmMessage={
                            <p>
                              <strong>{c.name}</strong> sairá do catálogo
                              público (perde o selo de verificada) e o badge
                              vai pra <em>Pendente</em>. Você pode reativar a
                              qualquer momento.
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
