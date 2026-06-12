import { z } from "zod";
import {
  citySchema as brCitySchema,
  cityOptionalSchema,
  cnpjSchema as brCnpjSchema,
  cnpjOptionalSchema,
  phoneBROptionalSchema,
  ufSchema as brUfSchema,
  ufOptionalSchema,
} from "@/lib/brasil-schemas";
import { sanitizeHttpUrl } from "@/lib/safe-url";

/**
 * Schemas Zod usados pelas server actions do admin. Centralizados
 * pra reuso e consistência de mensagens (sempre pt-BR).
 *
 * Convenções:
 *   - text "obrigatório": preventive — campos sem o nome ficam vazios
 *   - .transform corta espaços e normaliza caixa quando aplicável
 *   - mensagens curtas, diretas, em primeira pessoa do plural
 *   - docs e telefones passam pelos schemas brasil-schemas (DV check + E.164)
 */

export const uuidSchema = z
  .string()
  .uuid({ message: "ID inválido." });

/**
 * UF rigorosa — só aceita as 27 UFs do Brasil. Re-export pra uso direto
 * em outras actions do admin.
 */
export const ufSchema = brUfSchema;

const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

/**
 * URL http(s) opcional — rejeita `javascript:`/`data:` etc. (XSS armazenado
 * em href público, auditoria 2026-06-12). Sem scheme assume https://.
 */
const httpUrlOptional = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .refine((v) => !v || v.length === 0 || sanitizeHttpUrl(v) !== null, {
      message: "URL inválida — use um endereço http(s) válido.",
    })
    .transform((v) => sanitizeHttpUrl(v ?? null));

const requiredText = (label: string, max = 200) =>
  z
    .string({ message: `${label} obrigatório.` })
    .trim()
    .min(1, { message: `${label} obrigatório.` })
    .max(max, { message: `${label} muito longo.` });

// CNPJ opcional com DV check (brasil-schemas). Vazio vira null.
const cnpjOpcional = cnpjOptionalSchema;

const REGIAO_VALUES = [
  "zona_da_mata",
  "sul_de_minas",
  "cerrado_mineiro",
  "matas_de_minas",
  "caparao",
  "mogiana",
  "espirito_santo",
  "bahia",
  "rondonia",
  "outras",
] as const;

const regiaoSchema = z.enum(REGIAO_VALUES);

// Coordenada decimal opcional (-180..180 pra lng, -90..90 pra lat).
// Aceita "-20,2587" e "-20.2587". Vazio vira null.
const coord = (label: string, min: number, max: number) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v == null || v === "") return null;
      const s = String(v).trim().replace(",", ".");
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    })
    .refine((v) => v === null || (v >= min && v <= max), {
      message: `${label} deve estar entre ${min} e ${max}.`,
    });

// =================================================================
// Corretora
// =================================================================
export const corretoraSchema = z.object({
  name: requiredText("Nome", 200),
  city: cityOptionalSchema,
  state: ufOptionalSchema,
  phone: phoneBROptionalSchema,
  telefone_fixo: phoneBROptionalSchema,
  email: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim().toLowerCase() : null))
    .refine((v) => v === null || /.+@.+\..+/.test(v), {
      message: "E-mail inválido.",
    }),
  cnpj: cnpjOpcional,
  inscricao_est: optionalText(30),
  cep: optionalText(15),
  endereco: optionalText(200),
  bairro: optionalText(100),
  site_url: httpUrlOptional(200),
  descricao: optionalText(1000),
  logo_url: httpUrlOptional(500),
  regioes_atendimento: z.array(regiaoSchema).default([]),
  especialidades: z
    .array(z.string().trim().min(1).max(60))
    .max(20)
    .default([]),
  lat: coord("Latitude", -90, 90),
  lng: coord("Longitude", -180, 180),
});

// =================================================================
// Plano
// =================================================================
export const planSchema = z.object({
  name: requiredText("Nome", 100),
  description: optionalText(500),
  // Vem do form como "199,90" ou "199.90"; convertemos pra cents
  price_cents: z.number().int().min(0, { message: "Preço inválido." }),
  billing_period: z.enum(["monthly", "yearly"]),
  features: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  active: z.boolean().default(true),
});

// =================================================================
// Aprovação de corretora
// =================================================================
export const aprovarCorretoraSchema = z.object({
  profile_id: uuidSchema,
  name: requiredText("Nome da corretora", 200),
  cnpj: brCnpjSchema,
  city: brCitySchema,
  state: ufOptionalSchema,
});

export const rejeitarCorretoraSchema = z.object({
  profile_id: uuidSchema,
});

// =================================================================
// Subscription
// =================================================================
const SUB_STATUSES = [
  "trial",
  "active",
  "past_due",
  "canceled",
  "expired",
] as const;

export const updateSubscriptionSchema = z.object({
  id: uuidSchema,
  status: z.enum(SUB_STATUSES),
  plan_id: uuidSchema.nullish().transform((v) => v ?? null),
  trial_ends_at: z
    .string()
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  current_period_end: z
    .string()
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  notes: optionalText(1000),
});

export const subscriptionIdSchema = z.object({
  id: uuidSchema,
});

// =================================================================
// Helpers
// =================================================================
/**
 * Pega FormData → Record<string, FormDataEntryValue|string[]> antes de
 * passar pro Zod. Trata array vindo de checkboxes (regioes_atendimento)
 * e campos repetidos (features[]).
 */
export function formDataToObject(
  formData: FormData,
  arrayKeys: string[] = [],
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  const arraySet = new Set(arrayKeys);

  for (const key of new Set(Array.from(formData.keys()))) {
    if (arraySet.has(key)) {
      obj[key] = formData.getAll(key).map((v) => String(v));
    } else {
      obj[key] = formData.get(key);
    }
  }
  return obj;
}

/**
 * Concatena todas as mensagens de erro do Zod em uma única string
 * separada por "; ". Útil pra mostrar via query string ?error= ou toast.
 */
export function flattenZodErrors(err: z.ZodError): string {
  return err.issues
    .map((i) => i.message)
    .filter(Boolean)
    .join("; ");
}
