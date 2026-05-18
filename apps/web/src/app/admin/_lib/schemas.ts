import { z } from "zod";

/**
 * Schemas Zod usados pelas server actions do admin. Centralizados
 * pra reuso e consistência de mensagens (sempre pt-BR).
 *
 * Convenções:
 *   - text "obrigatório": preventive — campos sem o nome ficam vazios
 *   - .transform corta espaços e normaliza caixa quando aplicável
 *   - mensagens curtas, diretas, em primeira pessoa do plural
 */

export const uuidSchema = z
  .string()
  .uuid({ message: "ID inválido." });

export const ufSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(2, { message: "UF tem 2 letras." })
  .regex(/^[A-Z]{2}$/, { message: "UF inválida." });

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

const cnpjOpcional = z
  .string()
  .optional()
  .transform((v) => {
    if (!v) return null;
    const digits = String(v).replace(/\D/g, "");
    return digits.length > 0 ? digits : null;
  })
  .refine((v) => v === null || v.length === 14, {
    message: "CNPJ precisa ter 14 dígitos.",
  });

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

export const regiaoSchema = z.enum(REGIAO_VALUES);

// =================================================================
// Corretora
// =================================================================
export const corretoraSchema = z.object({
  name: requiredText("Nome", 200),
  city: optionalText(100),
  state: ufSchema.nullish().transform((v) => v ?? null),
  phone: optionalText(20),
  telefone_fixo: optionalText(20),
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
  site_url: optionalText(200),
  descricao: optionalText(1000),
  logo_url: optionalText(500),
  regioes_atendimento: z.array(regiaoSchema).default([]),
});

export type CorretoraInput = z.infer<typeof corretoraSchema>;

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

export type PlanInput = z.infer<typeof planSchema>;

// =================================================================
// Aprovação de corretora
// =================================================================
export const aprovarCorretoraSchema = z.object({
  profile_id: uuidSchema,
  name: requiredText("Nome da corretora", 200),
  cnpj: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 14, {
      message: "CNPJ precisa ter 14 dígitos.",
    }),
  city: requiredText("Cidade", 100),
  state: ufSchema.optional().nullable().transform((v) => v ?? null),
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
