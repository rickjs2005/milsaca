import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Traduz erros do PostgREST/Postgres para mensagens em pt-BR amigáveis.
 *
 * Códigos cobertos: https://www.postgresql.org/docs/current/errcodes-appendix.html
 *
 * Mensagens internas (texto cru do Postgres) NUNCA vazam pro usuário —
 * vão pro console.error em modo dev pra debug do admin.
 */
export function friendlyPostgresError(
  error: PostgrestError | { message: string; code?: string } | null | undefined,
  fallback = "Não foi possível concluir a ação. Tente novamente.",
): string {
  if (!error) return fallback;

  // Log interno (não envia ao client)
  if (process.env.NODE_ENV !== "production") {
    console.error("[admin] postgres error:", error);
  }

  const code = "code" in error ? error.code : undefined;
  const msg = String(error.message ?? "");

  // Unicidade violada
  if (code === "23505") {
    if (/cnpj/i.test(msg)) return "Já existe uma corretora com este CNPJ.";
    if (/slug/i.test(msg)) return "Já existe um registro com este slug.";
    if (/email/i.test(msg)) return "Este e-mail já está cadastrado.";
    return "Já existe um registro com esses dados.";
  }

  // Foreign key violada
  if (code === "23503") {
    return "Não foi possível salvar — referência inválida (registro relacionado não existe).";
  }

  // Not null violado
  if (code === "23502") {
    return "Preencha todos os campos obrigatórios.";
  }

  // Check violado
  if (code === "23514") {
    return "Algum valor não é permitido. Confira os campos.";
  }

  // Permission denied
  if (code === "42501") {
    return "Você não tem permissão pra esta ação.";
  }

  // RLS violado
  if (code === "PGRST301" || /row-level security/i.test(msg)) {
    return "Você não tem permissão pra esta ação.";
  }

  // Forbidden (RPC custom)
  if (/forbidden/i.test(msg)) {
    return "Você não tem permissão pra esta ação.";
  }

  return fallback;
}
