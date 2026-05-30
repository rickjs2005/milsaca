import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@milsaca/types/database";

/**
 * Client Supabase "público" para leitura de dados anônimos (views/RPCs
 * com grant pra anon ou authenticated), SEM cookie store.
 *
 * Por que existir: o client de `./web/server` usa `cookies()`, o que torna
 * qualquer rota que o consuma DINÂMICA no Next 16 — e nesse caso o
 * `export const revalidate` da página é ignorado. Para cachear dados 100%
 * públicos via `unstable_cache` (de `next/cache`), a função de fetch NÃO
 * pode tocar em APIs dinâmicas (cookies/headers). Este client usa só a
 * publishable key, sem sessão, então é seguro chamá-lo dentro de
 * `unstable_cache`.
 *
 * Não persiste/atualiza sessão — é stateless e read-only por design.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
