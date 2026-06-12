/**
 * Parse de número em formato pt-BR ("1.234,56") vindo de form
 * `type="text" inputMode="decimal"` das server actions.
 *
 * Fonte única das ~14 cópias locais que existiam nos `_actions.ts`
 * (auditoria 2026-06-12). A semântica foi preservada byte a byte:
 *
 * - `"1.234,56"` → `1234.56` (ponto é separador de MILHAR, vírgula é decimal)
 * - `"1450"`     → `1450`
 * - `"1234.56"`  → ⚠️ `123456` — **PEGADINHA**: o ponto é tratado como
 *   milhar SEMPRE, mesmo sem vírgula. `"12.5"` vira `125`, não `12.5`.
 *   É o comportamento histórico de todas as cópias (remove TODOS os
 *   pontos antes de trocar a vírgula); não "corrigir" sem migrar os
 *   forms — o usuário BR digita vírgula como decimal.
 * - Espaços (inclusive internos) são removidos: `"1 000,5"` → `1000.5`.
 * - Só a PRIMEIRA vírgula é trocada: `"1,2,3"` → `NaN` → `null`.
 * - NÃO limpa "R$" nem outros símbolos: `"R$ 10"` → `null` (quem precisa
 *   limpar moeda faz o pre-strip no call-site, ex.: reaisToCents do admin).
 *
 * Pra parsers que tratam ponto como DECIMAL (ex.: percentuais "1.0",
 * coordenadas, kg em entregas), NÃO use este módulo — são outra família
 * de semântica (vírgula→ponto apenas, sem remover pontos).
 */

export type ParseNumeroBROptions = {
  /** Exige n > 0 (preços): "0" e negativos viram null. */
  exigirPositivo?: boolean;
  /** Aceita negativos/zero — só exige número finito (ajustes, repasses). */
  permitirNegativo?: boolean;
};

/**
 * Normalização crua compartilhada: trim, remove TODO espaço, remove
 * TODOS os pontos (milhar — ver pegadinha acima) e troca a primeira
 * vírgula por ponto. Não valida nada; pode devolver string vazia ou
 * algo que vira NaN. Use quando o call-site tem validação própria
 * (zod transforms, parse que retorna NaN de propósito).
 */
export function limparNumeroBR(v: string): string {
  return v.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
}

/**
 * Decimal pt-BR → number, ou null se vazio/inválido.
 *
 * Default (semântica majoritária das cópias): aceita n >= 0; negativo,
 * NaN, vazio e null viram null. Variantes via opções:
 * - `{ exigirPositivo: true }`  → só n > 0 (preço/quantidade)
 * - `{ permitirNegativo: true }` → qualquer número finito
 */
export function parseNumeroBR(
  v: FormDataEntryValue | string | number | null | undefined,
  opts: ParseNumeroBROptions = {},
): number | null {
  if (v == null) return null;
  const s = limparNumeroBR(String(v));
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (opts.permitirNegativo) return n;
  if (opts.exigirPositivo) return n > 0 ? n : null;
  return n >= 0 ? n : null;
}

/**
 * Inteiro >= 0 via `parseInt(s, 10)`, ou null se vazio/inválido/negativo.
 *
 * Espelha as cópias `parseInteger`/`parseInt0` das actions: NÃO faz
 * limpeza pt-BR — `parseInt` para no primeiro caractere não numérico,
 * então `"1.234"` → `1` e `"12,9"` → `12` (comportamento histórico).
 */
export function parseInteiroBR(
  v: FormDataEntryValue | string | number | null | undefined,
): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
