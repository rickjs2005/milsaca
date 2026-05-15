import type { Database } from "@milsaca/types/database";

/**
 * Helper de tipos para Insert/Update das tabelas.
 *
 * Por que existe: o postgrest-js 2.105 tem um bug de inferência em que
 * o payload de `.insert()` / `.update()` é inferido como `never[]` /
 * `never` para tabelas tipadas via Database custom (editado à mão),
 * mesmo quando o tipo Database está correto. O workaround é tipar
 * o payload explicitamente e fazer cast no momento da chamada:
 *
 *   const payload: TablesInsert<"lotes"> = { ... };
 *   await supabase.from("lotes").insert(payload as never);
 *
 * Quando regenerarmos `database.ts` via `supabase gen types typescript`
 * com CLI logada, o bug deve sumir e esses casts podem ser removidos.
 */
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type TablesRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
