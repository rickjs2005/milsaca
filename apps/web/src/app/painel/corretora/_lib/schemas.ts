import { z } from "zod";
import {
  cityOptionalSchema,
  cnpjOptionalSchema,
  phoneBROptionalSchema,
  ufOptionalSchema,
} from "@/lib/brasil-schemas";

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

// Decimal vindo do form pode chegar "1.234,56" ou "1234.56" — normaliza
const decimal = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v == null || v === "") return null;
    const s = String(v)
      .trim()
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : null;
  });

const positiveInt = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v == null || v === "") return null;
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  });

const percent = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v == null || v === "") return null;
    const s = String(v).trim().replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
  });

// =================================================================
// Contrato
// =================================================================
const CONTRATO_STATUSES = [
  "rascunho",
  "em_analise",
  "ativo",
  "finalizado",
  "cancelado",
] as const;

export const createContratoSchema = z.object({
  produtor_id: uuidSchema,
  comprador_id: uuidSchema.nullish().transform((v) => v ?? null),
  lead_id: uuidSchema.nullish().transform((v) => v ?? null),
  coffee_type: optionalText(80),
  bag_count: positiveInt,
  total_value: decimal,
  comissao_pct: percent,
  code: optionalText(40),
});

export const updateContratoStatusSchema = z.object({
  id: uuidSchema,
  status: z.enum(CONTRATO_STATUSES),
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
// Entrega
// =================================================================
const ENTREGA_STATUSES = [
  "programada",
  "em_transito",
  "recebida",
  "conferida",
  "cancelada",
] as const;

export const createEntregaSchema = z.object({
  contrato_id: uuidSchema,
  data_prevista: optionalText(20),
  bag_count: positiveInt,
  observacoes: optionalText(500),
});

export const updateEntregaStatusSchema = z.object({
  id: uuidSchema,
  status: z.enum(ENTREGA_STATUSES),
});

// =================================================================
// Lead
// =================================================================
const LEAD_STATUSES = [
  "novo",
  "em_negociacao",
  "convertido",
  "perdido",
  "arquivado",
] as const;

export const createLeadSchema = z.object({
  produtor_id: uuidSchema.nullish().transform((v) => v ?? null),
  contato_id: uuidSchema.nullish().transform((v) => v ?? null),
  coffee_type: optionalText(80),
  bag_count: positiveInt,
  proposed_price: decimal,
  notes: optionalText(2000),
}).refine(
  (v) => (v.produtor_id != null) !== (v.contato_id != null),
  { message: "Informe exatamente um: produtor cadastrado ou contato pendente." },
);

export const updateLeadStatusSchema = z.object({
  id: uuidSchema,
  status: z.enum(LEAD_STATUSES),
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
// Cotação manual
// =================================================================
export const createCotacaoSchema = z.object({
  coffee_type: requiredText("Tipo de café", 80),
  region: optionalText(100),
  price: decimal,
  source: optionalText(100),
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
