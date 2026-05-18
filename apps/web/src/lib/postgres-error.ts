import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Traduz erros do PostgREST/Postgres para mensagens em pt-BR amigáveis.
 *
 * Códigos: https://www.postgresql.org/docs/current/errcodes-appendix.html
 *
 * Mensagens internas (texto cru do Postgres) NUNCA vazam pro usuário —
 * vão pro console.error em modo dev pra debug.
 *
 * Compartilhado entre /admin e /painel/corretora.
 */
export function friendlyPostgresError(
  error:
    | PostgrestError
    | { message: string; code?: string }
    | null
    | undefined,
  fallback = "Não foi possível concluir a ação. Tente novamente.",
): string {
  if (!error) return fallback;

  if (process.env.NODE_ENV !== "production") {
    console.error("[milsaca] postgres error:", error);
  }

  const code = "code" in error ? error.code : undefined;
  const msg = String(error.message ?? "");

  // Unicidade violada
  if (code === "23505") {
    if (/cnpj/i.test(msg)) return "Já existe registro com este CNPJ.";
    if (/slug/i.test(msg)) return "Já existe um registro com este slug.";
    if (/email/i.test(msg)) return "Este e-mail já está cadastrado.";
    if (/code/i.test(msg)) return "Já existe um registro com este código.";
    return "Já existe um registro com esses dados.";
  }

  if (code === "23503") {
    return "Não foi possível salvar — referência inválida (registro relacionado não existe).";
  }

  if (code === "23502") {
    return "Preencha todos os campos obrigatórios.";
  }

  if (code === "23514") {
    return "Algum valor não é permitido. Confira os campos.";
  }

  if (code === "42501") {
    return "Você não tem permissão pra esta ação.";
  }

  if (code === "PGRST301" || /row-level security/i.test(msg)) {
    return "Você não tem permissão pra esta ação.";
  }

  if (/forbidden/i.test(msg)) {
    return "Você não tem permissão pra esta ação.";
  }

  return fallback;
}
