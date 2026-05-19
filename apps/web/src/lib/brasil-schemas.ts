import { z } from "zod";
import {
  isValidCNPJ,
  isValidCPF,
  isValidCityName,
  isValidCpfOrCnpj,
  isValidPhoneBR,
  isValidUF,
  normalizeCNPJ,
  normalizeCPF,
  formatCityName,
  normalizeCpfOrCnpj,
  normalizePhoneBR,
  normalizeUF,
  UFS,
} from "./brasil";

/**
 * Schemas Zod reutilizáveis pra dados brasileiros.
 *
 * Todos normalizam antes de validar (limpa máscara, trim) e
 * retornam o valor pronto pra persistência:
 *   - CPF/CNPJ → só dígitos
 *   - Telefone → 55DDDXXXXXXXX (E.164 sem +)
 *   - UF → 2 letras uppercase
 *   - Cidade → trim + dedup espaços
 *
 * Versões `*Optional` aceitam vazio/null e devolvem null. Use quando
 * o campo for opcional no form.
 */

// Helper: trim de string que pode vir como FormDataEntryValue
function asString(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

// =================================================================
// CPF
// =================================================================

export const cpfSchema = z
  .string({ message: "Informe um CPF válido." })
  .transform((v) => normalizeCPF(v))
  .refine((v) => v.length > 0, { message: "Informe um CPF válido." })
  .refine(isValidCPF, { message: "Informe um CPF válido." });

export const cpfOptionalSchema = z
  .preprocess((v) => asString(v), z.string())
  .transform((v) => (v ? normalizeCPF(v) : ""))
  .transform((v) => (v.length === 0 ? null : v))
  .refine((v) => v === null || isValidCPF(v), {
    message: "Informe um CPF válido.",
  });

// =================================================================
// CNPJ
// =================================================================

export const cnpjSchema = z
  .string({ message: "Informe um CNPJ válido." })
  .transform((v) => normalizeCNPJ(v))
  .refine((v) => v.length > 0, { message: "Informe um CNPJ válido." })
  .refine(isValidCNPJ, { message: "Informe um CNPJ válido." });

export const cnpjOptionalSchema = z
  .preprocess((v) => asString(v), z.string())
  .transform((v) => (v ? normalizeCNPJ(v) : ""))
  .transform((v) => (v.length === 0 ? null : v))
  .refine((v) => v === null || isValidCNPJ(v), {
    message: "Informe um CNPJ válido.",
  });

// =================================================================
// CPF ou CNPJ (campos unificados como produtores.cpf_cnpj)
// =================================================================

export const cpfOrCnpjSchema = z
  .string({ message: "Informe um CPF ou CNPJ válido." })
  .transform((v) => normalizeCpfOrCnpj(v))
  .refine((v) => v.length > 0, {
    message: "Informe um CPF ou CNPJ válido.",
  })
  .refine(isValidCpfOrCnpj, {
    message: "Informe um CPF ou CNPJ válido.",
  });

export const cpfOrCnpjOptionalSchema = z
  .preprocess((v) => asString(v), z.string())
  .transform((v) => (v ? normalizeCpfOrCnpj(v) : ""))
  .transform((v) => (v.length === 0 ? null : v))
  .refine((v) => v === null || isValidCpfOrCnpj(v), {
    message: "Informe um CPF ou CNPJ válido.",
  });

// =================================================================
// Telefone / WhatsApp
// =================================================================

export const phoneBRSchema = z
  .string({ message: "Informe um telefone com DDD." })
  .refine(isValidPhoneBR, { message: "Informe um telefone com DDD." })
  .transform((v) => normalizePhoneBR(v)!);

export const phoneBROptionalSchema = z
  .preprocess((v) => asString(v), z.string())
  .transform((v) => (v.length === 0 ? null : v))
  .refine((v) => v === null || isValidPhoneBR(v), {
    message: "Informe um telefone com DDD.",
  })
  .transform((v) => (v ? normalizePhoneBR(v)! : null));

/**
 * WhatsApp é alias semântico — mesma validação que telefone celular.
 * Mensagem de erro específica.
 */
export const whatsappSchema = z
  .string({ message: "Informe um WhatsApp com DDD." })
  .refine(isValidPhoneBR, { message: "Informe um WhatsApp com DDD." })
  .transform((v) => normalizePhoneBR(v)!);

export const whatsappOptionalSchema = z
  .preprocess((v) => asString(v), z.string())
  .transform((v) => (v.length === 0 ? null : v))
  .refine((v) => v === null || isValidPhoneBR(v), {
    message: "Informe um WhatsApp com DDD.",
  })
  .transform((v) => (v ? normalizePhoneBR(v)! : null));

// =================================================================
// UF
// =================================================================

export const ufSchema = z
  .string({ message: "Selecione o estado." })
  .transform((v) => v.trim().toUpperCase())
  .refine(isValidUF, { message: "Selecione um estado válido." })
  .transform((v) => normalizeUF(v)!);

export const ufOptionalSchema = z
  .preprocess((v) => asString(v), z.string())
  .transform((v) => (v.length === 0 ? null : v.toUpperCase()))
  .refine((v) => v === null || isValidUF(v), {
    message: "Selecione um estado válido.",
  })
  .transform((v) => (v ? normalizeUF(v) : null));

// =================================================================
// Cidade
// =================================================================

export const citySchema = z
  .string({ message: "Informe a cidade." })
  .transform((v) => formatCityName(v))
  .refine((v) => v.length > 0, { message: "Informe a cidade." })
  .refine(isValidCityName, {
    message: "Cidade inválida. Use só letras e espaços.",
  });

export const cityOptionalSchema = z
  .preprocess((v) => asString(v), z.string())
  .transform((v) => formatCityName(v))
  .transform((v) => (v.length === 0 ? null : v))
  .refine((v) => v === null || isValidCityName(v), {
    message: "Cidade inválida. Use só letras e espaços.",
  });

// =================================================================
// Re-export pra conveniência
// =================================================================

export { UFS };
