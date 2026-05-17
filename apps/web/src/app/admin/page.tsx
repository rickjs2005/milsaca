import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Admin · Milsaca" };

export default async function AdminPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const [{ count: corretorasCount }, { count: produtoresCount }, { count: usersCount }] =
    await Promise.all([
      supabase.from("corretoras").select("*", { count: "exact", head: true }),
      supabase.from("produtores").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
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
        <Badge variant="outline" className="border-milsaca-dourado text-milsaca-verde">
          Stub — expandir no P1
        </Badge>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card label="Corretoras" value={corretorasCount ?? 0} />
        <Card label="Produtores" value={produtoresCount ?? 0} />
        <Card label="Usuários" value={usersCount ?? 0} />
      </div>

      <div className="mt-8 rounded-2xl border border-milsaca-verde/10 bg-milsaca-cream-escuro/30 p-6">
        <h2 className="text-lg font-semibold text-milsaca-verde">
          Próximas funcionalidades
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-milsaca-verde-claro">
          <li>• Cadastrar nova corretora (substitui SQL manual)</li>
          <li>• Listar/ativar/desativar corretoras (`verified` toggle)</li>
          <li>• Listar produtores e corrigir vínculos</li>
          <li>• Status básico da plataforma (sessões ativas, últimas ações)</li>
        </ul>
        <div className="mt-4">
          <Link
            href="/painel/corretora"
            className="text-sm text-milsaca-dourado underline-offset-2 hover:underline"
          >
            ← Voltar pro painel corretora
          </Link>
        </div>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-milsaca-verde/10 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-milsaca-verde-claro">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-milsaca-verde">{value}</p>
    </div>
  );
}
