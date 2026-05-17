import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { createCorretora } from "../../_actions";

export const metadata = { title: "Nova corretora · Admin Milsaca" };

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NovaCorretoraPage({ searchParams }: PageProps) {
  await requireRole("admin");
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/admin/corretoras"
        className="text-xs text-milsaca-dourado hover:underline"
      >
        ← Corretoras
      </Link>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-milsaca-verde">
        Nova corretora
      </h1>
      <p className="mt-1 text-sm text-milsaca-verde-claro">
        Cadastre uma corretora pra ela aparecer pra produtores e poder operar.
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <form
        action={createCorretora}
        className="mt-8 space-y-4 rounded-2xl border border-milsaca-verde/10 bg-white p-6 shadow-sm"
      >
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-milsaca-verde-claro">
            Nome *
          </label>
          <input
            name="name"
            required
            placeholder="Café & Cia Corretagem"
            className="w-full rounded-xl border border-milsaca-verde/20 px-3 py-2 text-sm text-milsaca-verde outline-none focus:border-milsaca-dourado"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-milsaca-verde-claro">
            Slug (URL)
          </label>
          <input
            name="slug"
            placeholder="cafe-cia (gerado do nome se vazio)"
            className="w-full rounded-xl border border-milsaca-verde/20 px-3 py-2 font-mono text-sm text-milsaca-verde outline-none focus:border-milsaca-dourado"
          />
          <p className="text-xs text-milsaca-verde-claro/70">
            Usado em códigos de contrato (<code>slug-2026-0001</code>).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-milsaca-verde-claro">
              Cidade
            </label>
            <input
              name="city"
              placeholder="Manhuaçu/MG"
              className="w-full rounded-xl border border-milsaca-verde/20 px-3 py-2 text-sm text-milsaca-verde outline-none focus:border-milsaca-dourado"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-milsaca-verde-claro">
              Telefone (WhatsApp)
            </label>
            <input
              name="phone"
              placeholder="(33) 99999-9999"
              className="w-full rounded-xl border border-milsaca-verde/20 px-3 py-2 text-sm text-milsaca-verde outline-none focus:border-milsaca-dourado"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-milsaca-verde-claro">
          <input type="checkbox" name="verified" defaultChecked />
          Marcar como verificada
        </label>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button asChild variant="outline">
            <Link href="/admin/corretoras">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
          >
            Criar corretora
          </Button>
        </div>
      </form>
    </main>
  );
}
