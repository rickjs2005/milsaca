import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Admin · Milsaca" };

export default async function AdminPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const [
    { count: corretorasCount },
    { count: produtoresCount },
    { count: usersCount },
    { count: leadsCount },
    { count: contratosCount },
    { data: ultimasCorretoras },
  ] = await Promise.all([
    supabase.from("corretoras").select("*", { count: "exact", head: true }),
    supabase.from("produtores").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("contratos").select("*", { count: "exact", head: true }),
    supabase
      .from("corretoras")
      .select("id, name, slug, verified, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-milsaca-verde">
            Admin
          </h1>
          <p className="mt-1 text-sm text-milsaca-verde-claro">
            Visão geral da plataforma.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-milsaca-dourado text-milsaca-verde"
        >
          MVP
        </Badge>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card label="Corretoras" value={corretorasCount ?? 0} href="/admin/corretoras" />
        <Card label="Produtores" value={produtoresCount ?? 0} />
        <Card label="Usuários" value={usersCount ?? 0} />
        <Card label="Leads" value={leadsCount ?? 0} />
        <Card label="Contratos" value={contratosCount ?? 0} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-milsaca-verde/10 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-milsaca-verde">
              Últimas corretoras
            </h2>
            <Link
              href="/admin/corretoras"
              className="text-xs text-milsaca-dourado hover:underline"
            >
              Ver todas →
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-milsaca-verde/5">
            {(ultimasCorretoras ?? []).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-milsaca-verde">{c.name}</p>
                  <p className="font-mono text-xs text-milsaca-verde-claro">
                    {c.slug}
                  </p>
                </div>
                {c.verified ? (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    Verificada
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-milsaca-verde-claro">
                    Pendente
                  </Badge>
                )}
              </li>
            ))}
            {(ultimasCorretoras?.length ?? 0) === 0 ? (
              <li className="py-6 text-center text-sm text-milsaca-verde-claro">
                Nenhuma corretora ainda.{" "}
                <Link
                  href="/admin/corretoras/nova"
                  className="text-milsaca-dourado hover:underline"
                >
                  Cadastrar a primeira
                </Link>
              </li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-2xl border border-milsaca-verde/10 bg-milsaca-cream-escuro/30 p-6">
          <h2 className="text-lg font-semibold text-milsaca-verde">
            Atalhos
          </h2>
          <div className="mt-4 grid gap-2">
            <Link
              href="/admin/corretoras/nova"
              className="rounded-xl border border-milsaca-verde/10 bg-white px-4 py-3 text-sm text-milsaca-verde hover:border-milsaca-dourado"
            >
              + Cadastrar nova corretora
            </Link>
            <Link
              href="/admin/corretoras"
              className="rounded-xl border border-milsaca-verde/10 bg-white px-4 py-3 text-sm text-milsaca-verde hover:border-milsaca-dourado"
            >
              Ativar/desativar corretora
            </Link>
            <Link
              href="/painel/corretora"
              className="rounded-xl border border-milsaca-verde/10 bg-white px-4 py-3 text-sm text-milsaca-verde hover:border-milsaca-dourado"
            >
              Ir pro painel da corretora
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const inner = (
    <div className="rounded-2xl border border-milsaca-verde/10 bg-white p-5 shadow-sm transition hover:border-milsaca-dourado">
      <p className="text-xs uppercase tracking-wide text-milsaca-verde-claro">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-milsaca-verde">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
