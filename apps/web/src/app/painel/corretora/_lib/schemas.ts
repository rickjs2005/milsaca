import { z } from "zod";
import {
  cityOptionalSchema,
  cnpjOptionalSchema,
  cpfOrCnpjOptionalSchema,
  phoneBROptionalSchema,
  ufOptionalSchema,
} from "@/lib/brasil-schemas";
import { limparNumeroBR } from "@/lib/numero-br";

/**
 * Schemas Zod das server actions do painel da corretora.
 * Reusa helpers/helpers do admin onde fizer sentido.
 *
 * Convenções:
 *   - .transform corta espaços e normaliza casas decimais
 *   - mensagens curtas em pt-BR
 *   - empty string vira null pra não estourar NOT NULL
 *   - docs e telefones passam por brasil-schemas (DV check + E.164)
 */

export const uuidSchema = z.string().uuid({ message: "ID inválido." });

const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

const requiredText = (label: string, max = 200) =>
  z
    .string({ message: `${label} obrigatório.` })
    .trim()
    .min(1, { message: `${label} obrigatório.` })
    .max(max, { message: `${label} muito longo.` });

// Decimal vindo do form pode chegar "1.234,56" ou "1234.56" — normaliza.
// Mantém Number() direto (sem o guard de string vazia do parseNumeroBR):
// whitespace-only vira 0 aqui, comportamento histórico deste schema.
const decimal = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v == null || v === "") return null;
    const n = Number(limparNumeroBR(String(v)));
    return Number.isFinite(n) && n >= 0 ? n : null;
  });

// =================================================================
// Lote
// =================================================================
const LOTE_SPECIES = ["arabica", "conillon"] as const;
const LOTE_PROCESSOS = [
  "natural",
  "cereja_descascado",
  "cd_desmucilado",
  "despolpado",
  "fermentacao_induzida",
] as const;

export const createLoteSchema = z.object({
  codigo: requiredText("Código", 40),
  produtor_id: uuidSchema,
  specie: z.enum(LOTE_SPECIES),
  processo: z.enum(LOTE_PROCESSOS).nullish().transform((v) => v ?? null),
  safra: optionalText(20),
  descricao: optionalText(500),
  peso_sacas: decimal,
  umidade_inicial: decimal,
});

// =================================================================
// Comprador
// =================================================================
export const compradorSchema = z.object({
  name: requiredText("Nome", 200),
  trade_name: optionalText(200),
  cnpj: cnpjOptionalSchema,
  inscricao_estadual: optionalText(30),
  contact_name: optionalText(200),
  contact_email: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim().toLowerCase() : null))
    .refine((v) => v === null || /.+@.+\..+/.test(v), {
      message: "E-mail inválido.",
    }),
  contact_phone: phoneBROptionalSchema,
  city: cityOptionalSchema,
  state: ufOptionalSchema,
  tipo: optionalText(40),
  observacoes: optionalText(1000),
});

// =================================================================
// Perfil corretora (operador edita o que pode)
// =================================================================
export const perfilCorretoraSchema = z.object({
  full_name: requiredText("Nome do operador", 200),
  phone: phoneBROptionalSchema,
  city: cityOptionalSchema,
  state: ufOptionalSchema,
  email: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim().toLowerCase() : null))
    .refine((v) => v === null || /.+@.+\..+/.test(v), {
      message: "E-mail inválido.",
    }),
});

// =================================================================
// Produtor (corretora cadastra contato sombra)
// =================================================================
export const createProdutorContatoSchema = z.object({
  full_name: requiredText("Nome", 200),
  email: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim().toLowerCase() : null))
    .refine((v) => v === null || /.+@.+\..+/.test(v), {
      message: "E-mail inválido.",
    }),
  phone: phoneBROptionalSchema,
  fazenda_nome: optionalText(200),
  city: cityOptionalSchema,
  state: ufOptionalSchema,
  // Documentos do produtor (LGPD: só a corretora dona vê; espelham produtores).
  cpf_cnpj: cpfOrCnpjOptionalSchema,
  car: optionalText(60),
  caepf: optionalText(60),
  notes: optionalText(1000),
});

// =================================================================
// Helpers
// =================================================================
export function formDataToObject(
  formData: FormData,
  arrayKeys: string[] = [],
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  const arraySet = new Set(arrayKeys);
  for (const key of new Set(Array.from(formData.keys()))) {
    obj[key] = arraySet.has(key)
      ? formData.getAll(key).map((v) => String(v))
      : formData.get(key);
  }
  return obj;
}

export function flattenZodErrors(err: z.ZodError): string {
  return err.issues
    .map((i) => i.message)
    .filter(Boolean)
    .join("; ");
}
