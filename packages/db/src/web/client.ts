import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@milsaca/types/database";

/**
 * Client Supabase para uso no browser (componentes "use client").
 * Usa as chaves PUBLISHABLE (sb_publishable_*).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
