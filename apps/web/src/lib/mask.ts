/**
 * Helpers de máscara visual pra dados sensíveis que aparecem em telas
 * admin/painel. Diferente de `lib/brasil.ts` (que formata pra display
 * completo), aqui o objetivo é OFUSCAR parcialmente — vamos pra
 * tabelas/listas onde o admin vê só o suficiente pra identificar.
 *
 * Em tela de detalhe individual, é OK mostrar o valor completo via
 * `formatPhoneBR` / `formatCpfOrCnpj` de `lib/brasil.ts`.
 */

import { onlyDigits } from "./brasil";

/**
 * Máscara visual pra telefone BR em listagem.
 *
 *   "11987654321" → "(11) *****-4321"
 *   "1132456789"  → "(11) ****-6789"
 *
 * Mostra DDD + últimos 4 dígitos. Suficiente pra dar contexto sem
 * vazar o número inteiro.
 */
export function maskPhoneBR(value: string | null | undefined): string {
  if (!value) return "—";
  const d = onlyDigits(value);
  if (d.length < 10) return value;
  // Quando vier com prefixo 55 (E.164), pega DDD da posição certa.
  const noCountry = d.length === 13 ? d.slice(2) : d;
  const ddd = noCountry.slice(0, 2);
  const last4 = noCountry.slice(-4);
  const stars = noCountry.length === 11 ? "*****" : "****";
  return `(${ddd}) ${stars}-${last4}`;
}

/**
 * Formata CPF/CNPJ visualmente sem ofuscar — pra detalhe admin.
 *
 *   "12345678901"    → "123.456.789-01"
 *   "12345678000190" → "12.345.678/0001-90"
 *
 * Retorna o input original se não tiver tamanho esperado (preserva
 * dados parciais sem mentir sobre o formato).
 */
export function formatCpfCnpj(value: string | null | undefined): string {
  if (!value) return "—";
  const d = onlyDigits(value);
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  return value;
}

/**
 * Máscara visual pra CPF/CNPJ em listagem — mostra só os 3 primeiros e
 * 2 últimos dígitos. Use quando o admin não precisa do número completo
 * pra identificar (ex: lista de produtores cruzada com nome).
 *
 *   CPF  "12345678901"   → "123.x.x-01"  (estilo "123.***.***-01")
 *   CNPJ "12345678000190" → mascarado nos 8 dígitos centrais
 */
export function maskCpfCnpj(value: string | null | undefined): string {
  if (!value) return "—";
  const d = onlyDigits(value);
  if (d.length === 11) {
    return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
  }
  if (d.length === 14) {
    return `${d.slice(0, 2)}.***.***/****-${d.slice(12)}`;
  }
  return value;
}
