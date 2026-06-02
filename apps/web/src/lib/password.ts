/**
 * Política de senha do Milsaca — espelha a config do Supabase Auth
 * (password_min_length=8 + exige ao menos uma letra e um dígito), definida via
 * Management API em 2026-05-30. Validar no front evita que o usuário receba o
 * erro cru do GoTrue (em inglês) quando a senha não atende à regra do backend.
 *
 * Obs.: HIBP (senhas vazadas) exige Supabase Pro — ainda não habilitado.
 */
const MIN_PASSWORD = 8;

/**
 * Retorna uma mensagem de erro em pt-BR se a senha for fraca, ou `null` se ok.
 * Regra alinhada ao Supabase: mínimo 8 caracteres, com pelo menos uma letra
 * (qualquer caixa) e um dígito.
 */
export function validarSenha(password: string): string | null {
  if (password.length < MIN_PASSWORD) {
    return `Senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`;
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Senha precisa ter pelo menos uma letra e um número.";
  }
  return null;
}
