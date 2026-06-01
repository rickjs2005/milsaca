"use server";

import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";

export type CommandResult = {
  kind: "corretora" | "produtor" | "page";
  title: string;
  subtitle?: string;
  href: string;
};

/**
 * Busca global do CommandPalette. Server action porque acessa o banco
 * com RLS já filtrado. Retorna até 15 resultados misturando entidades
 * (corretora, produtor) e páginas conhecidas do admin.
 *
 * O cliente é responsável por debounce — aqui só consulta.
 */
export async function searchAdmin(q: string): Promise<CommandResult[]> {
  await requireAppAdmin();
  const term = q.trim();
  if (term.length < 2) return [];

  const supabase = await createClient();
  const like = `%${term}%`;

  const [{ data: corretoras }, { data: produtores }] = await Promise.all([
    supabase
      .from("corretoras")
      .select("id, name, slug, city, state")
      .or(`name.ilike.${like},slug.ilike.${like}`)
      .limit(6),
    // `profiles` não tem coluna `email` (o email do usuário vive em auth.users) —
    // selecionar/filtrar por `email` fazia o Postgrest falhar e a busca de
    // produtor voltava sempre vazia. Buscamos por nome OU telefone (WhatsApp-first),
    // colunas reais da tabela.
    supabase
      .from("profiles")
      .select("id, full_name, phone")
      .or(`full_name.ilike.${like},phone.ilike.${like}`)
      .contains("roles", ["produtor"])
      .limit(6),
  ]);

  const results: CommandResult[] = [];

  for (const c of corretoras ?? []) {
    const loc = [c.city, c.state].filter(Boolean).join(" / ");
    results.push({
      kind: "corretora",
      title: c.name,
      subtitle: [c.slug, loc].filter(Boolean).join(" · "),
      href: `/admin/corretoras/${c.id}`,
    });
  }

  for (const p of produtores ?? []) {
    results.push({
      kind: "produtor",
      title: p.full_name ?? "Produtor sem nome",
      subtitle: p.phone ?? undefined,
      href: `/admin/produtores/${p.id}`,
    });
  }

  return results;
}
