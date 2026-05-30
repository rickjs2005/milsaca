import { createClient } from "@supabase/supabase-js";
import type { Database } from "@milsaca/types/database";

/**
 * Client Supabase com a chave SECRET (service-role) para operações
 * administrativas no SERVER. Bypassa RLS e expõe a Admin API
 * (`supabase.auth.admin.*`).
 *
 * NUNCA importe isto em código que roda no browser — a SUPABASE_SECRET_KEY
 * (sb_secret_*) tem privilégios totais. Uso restrito a Server Actions /
 * Route Handlers chamados por operadores da plataforma (admin).
 *
 * Retorna `null` se a SUPABASE_SECRET_KEY não estiver configurada, para que
 * o chamador possa degradar com elegância em vez de quebrar.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    return null;
  }

  return createClient<Database>(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
