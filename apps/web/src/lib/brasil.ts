/**
 * Utilitários de validação e formatação pra dados brasileiros.
 *
 * Convenção: tudo que envia pra API/banco vai NORMALIZADO (só dígitos
 * pra docs; `55DDDXXXXXXXX` pra telefones — formato E.164 sem o "+").
 *
 * Funções `format*` aplicam máscara visual; `isValid*` validam
 * estrutura + dígito verificador; `normalize*` deixam o valor pronto
 * pra persistência (sempre safe pra rodar em entradas com ou sem máscara).
 */

// =================================================================
// Genéricos
// =================================================================

export function onlyDigits(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value).replace(/\D+/g, "");
}

function isAllSameDigit(digits: string): boolean {
  if (digits.length === 0) return false;
  return /^(\d)\1+$/.test(digits);
}

// =================================================================
// CPF
// =================================================================

/**
 * Calcula o dígito verificador do CPF.
 * `factor` começa em 10 pro primeiro DV, 11 pro segundo.
 */
function cpfCheckDigit(base: string, factor: number): number {
  let sum = 0;
  for (let i = 0; i < base.length; i++) {
    sum += Number(base[i]) * factor--;
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCPF(value: string | null | undefined): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return false;
  if (isAllSameDigit(digits)) return false;
  const dv1 = cpfCheckDigit(digits.slice(0, 9), 10);
  if (dv1 !== Number(digits[9])) return false;
  const dv2 = cpfCheckDigit(digits.slice(0, 10), 11);
  return dv2 === Number(digits[10]);
}

export function formatCPF(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9)
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function normalizeCPF(value: string | null | undefined): string {
  return onlyDigits(value).slice(0, 11);
}

// =================================================================
// CNPJ
// =================================================================

const CNPJ_WEIGHTS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_WEIGHTS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function cnpjCheckDigit(base: string, weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < base.length; i++) {
    sum += Number(base[i]) * weights[i]!;
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCNPJ(value: string | null | undefined): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return false;
  if (isAllSameDigit(digits)) return false;
  const dv1 = cnpjCheckDigit(digits.slice(0, 12), CNPJ_WEIGHTS_1);
  if (dv1 !== Number(digits[12])) return false;
  const dv2 = cnpjCheckDigit(digits.slice(0, 13), CNPJ_WEIGHTS_2);
  return dv2 === Number(digits[13]);
}

export function formatCNPJ(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function normalizeCNPJ(value: string | null | undefined): string {
  return onlyDigits(value).slice(0, 14);
}

// =================================================================
// CPF ou CNPJ (campo unificado em produtores.cpf_cnpj)
// =================================================================

export function isValidCpfOrCnpj(value: string | null | undefined): boolean {
  const d = onlyDigits(value);
  if (d.length === 11) return isValidCPF(d);
  if (d.length === 14) return isValidCNPJ(d);
  return false;
}

export function formatCpfOrCnpj(value: string | null | undefined): string {
  const d = onlyDigits(value);
  if (d.length <= 11) return formatCPF(d);
  return formatCNPJ(d);
}

export function normalizeCpfOrCnpj(
  value: string | null | undefined,
): string {
  return onlyDigits(value);
}

// =================================================================
// Telefone / WhatsApp brasileiro
// =================================================================

/**
 * Normaliza telefone brasileiro pra formato E.164 sem o "+":
 *   `55DDDXXXXXXXX` (12 ou 13 dígitos)
 *
 * Aceita entradas em qualquer formato comum:
 *   "(33) 99999-9999"
 *   "+55 33 99999-9999"
 *   "33999999999"
 *   "5533999999999"
 *
 * Retorna null se não consegue derivar número plausível.
 */
export function normalizePhoneBR(
  value: string | null | undefined,
): string | null {
  const d = onlyDigits(value);
  if (!d) return null;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if (d.length === 12 || d.length === 13) {
    return d.startsWith("55") ? d : null;
  }
  return null;
}

/**
 * Valida telefone brasileiro:
 *   - Fixo: 10 dígitos (DDD 2 dígitos + 8 dígitos, começando 2-5)
 *   - Celular: 11 dígitos (DDD 2 dígitos + 9 + 8 dígitos)
 *   - Com DDI 55: 12 ou 13 dígitos no total
 *
 * DDD: 11-99 (aceita todos os DDDs reais do Brasil).
 */
export function isValidPhoneBR(value: string | null | undefined): boolean {
  const normalized = normalizePhoneBR(value);
  if (!normalized) return false;
  // normalized é "55" + 10 ou 11 dígitos
  const national = normalized.slice(2);
  if (national.length !== 10 && national.length !== 11) return false;
  const ddd = Number(national.slice(0, 2));
  if (Number.isNaN(ddd) || ddd < 11 || ddd > 99) return false;
  if (national.length === 11) {
    // Celular: terceiro dígito (primeiro após DDD) tem que ser 9
    if (national[2] !== "9") return false;
  } else {
    // Fixo: terceiro dígito 2-5
    const first = Number(national[2]);
    if (Number.isNaN(first) || first < 2 || first > 5) return false;
  }
  return true;
}

/**
 * Aplica máscara visual durante digitação. Mantém qualquer entrada
 * (não é destrutivo) — só formata o que conseguir.
 *
 *   Celular: (33) 99999-9999
 *   Fixo:    (33) 3333-4444
 *
 * Trata entrada com DDI 55 stripping-o pra preview.
 */
export function formatPhoneBR(value: string | null | undefined): string {
  let d = onlyDigits(value);
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) {
    d = d.slice(2);
  }
  d = d.slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Telefone em formato E.164 com `+` no início, pronto pra ITU.
 * Útil pra integrações que exigem o padrão completo.
 */
export function toWhatsAppE164(
  value: string | null | undefined,
): string | null {
  const n = normalizePhoneBR(value);
  return n ? `+${n}` : null;
}

/**
 * Gera URL `wa.me` pra abrir conversa direto. Mensagem é encoded.
 * Retorna null quando telefone inválido — caller NÃO deve renderizar
 * link.
 */
export function buildWhatsAppLink(
  phone: string | null | undefined,
  message: string,
): string | null {
  if (!isValidPhoneBR(phone)) return null;
  const normalized = normalizePhoneBR(phone)!;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

// =================================================================
// UF
// =================================================================

export const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

export type UF = (typeof UFS)[number];

const UF_SET = new Set<string>(UFS);

export function isValidUF(value: string | null | undefined): boolean {
  if (!value) return false;
  return UF_SET.has(String(value).trim().toUpperCase());
}

export function normalizeUF(
  value: string | null | undefined,
): UF | null {
  if (!value) return null;
  const upper = String(value).trim().toUpperCase();
  return UF_SET.has(upper) ? (upper as UF) : null;
}

// =================================================================
// Cidade
// =================================================================

const CITY_INVALID_CHARS = /[<>{}[\]\\/|=`~$%@#^&*0-9]/;

/**
 * Trim, dedup espaços. Não muda capitalização — autocomplete IBGE já
 * entrega no formato canônico.
 */
export function formatCityName(value: string | null | undefined): string {
  if (!value) return "";
  return String(value).trim().replace(/\s+/g, " ");
}

/**
 * Cidade aceita acentos, hífen e apóstrofo (Foz d'Iguaçu, São João del-Rei).
 * Rejeita números, brackets, HTML-ish characters e tamanhos extremos.
 */
export function isValidCityName(
  value: string | null | undefined,
): boolean {
  const v = formatCityName(value);
  if (v.length < 2) return false;
  if (v.length > 100) return false;
  if (CITY_INVALID_CHARS.test(v)) return false;
  return true;
}

// =================================================================
// CEP
// =================================================================

export function formatCEP(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function isValidCEP(value: string | null | undefined): boolean {
  const d = onlyDigits(value);
  if (d.length !== 8) return false;
  if (isAllSameDigit(d)) return false;
  return true;
}

export function normalizeCEP(
  value: string | null | undefined,
): string | null {
  const d = onlyDigits(value);
  return d.length === 8 ? d : null;
}
