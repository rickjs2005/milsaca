import { createClient } from "@milsaca/db/web/server";

/**
 * Tipos das chaves conhecidas. Adicione aqui ao introduzir nova key
 * (mantém sincronia entre form + seeds da migration).
 */
export type SettingKey =
  | "trial_days"
  | "public_signup_produtor"
  | "public_signup_corretora"
  | "manual_approval_corretora"
  | "founder_program_open"
  | "founder_slots_total"
  | "support_whatsapp"
  | "support_email"
  | "whatsapp_provider"
  | "cotacoes_provider"
  | "region_default"
  | "lead_distribution_mode"
  | "lead_max_per_corretora_solo"
  | "lead_max_per_corretora_pro"
  | "dispatch_worker_url"
  | "dispatch_worker_secret";

export type SettingRow = {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
};

export async function listSettings(): Promise<SettingRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("key, value, description, updated_at")
    .order("key", { ascending: true });
  return (data ?? []) as SettingRow[];
}

/**
 * Estrutura de agrupamento pra renderizar o form em seções.
 * Cada seção tem título + lista de keys.
 */
export const SETTING_SECTIONS: {
  title: string;
  description: string;
  keys: SettingKey[];
}[] = [
  {
    title: "Cadastro",
    description: "Quem pode entrar no Milsaca e como.",
    keys: [
      "public_signup_produtor",
      "public_signup_corretora",
      "manual_approval_corretora",
      "trial_days",
      "founder_program_open",
      "founder_slots_total",
    ],
  },
  {
    title: "Suporte",
    description: "Canais oficiais expostos no app público.",
    keys: ["support_whatsapp", "support_email"],
  },
  {
    title: "Distribuição de leads",
    description: "Como o sistema escolhe corretora pra cada lead.",
    keys: [
      "lead_distribution_mode",
      "lead_max_per_corretora_solo",
      "lead_max_per_corretora_pro",
    ],
  },
  {
    title: "Integrações",
    description: "Providers externos contratados (ou placeholders).",
    keys: ["whatsapp_provider", "cotacoes_provider"],
  },
  {
    title: "Defaults",
    description: "Valores padrão de catálogos públicos.",
    keys: ["region_default"],
  },
  {
    title: "Worker de comunicação",
    description:
      "Endpoint HTTP que envia message_dispatches. Vazio = stub local marca como no_provider. Setar quando edge function send-dispatch estiver deployada.",
    keys: ["dispatch_worker_url", "dispatch_worker_secret"],
  },
];

/**
 * Hint de tipo pra cada chave — controla qual input renderizar.
 *   "boolean" → checkbox
 *   "number"  → input numeric
 *   "select"  → dropdown (com options)
 *   "string"  → input text
 */
export type SettingType =
  | { kind: "boolean" }
  | { kind: "number"; min?: number; max?: number; suffix?: string }
  | { kind: "select"; options: { value: string; label: string }[] }
  | { kind: "string"; placeholder?: string };

export const SETTING_TYPES: Record<SettingKey, SettingType> = {
  trial_days: { kind: "number", min: 0, max: 365, suffix: "dias" },
  public_signup_produtor: { kind: "boolean" },
  public_signup_corretora: { kind: "boolean" },
  manual_approval_corretora: { kind: "boolean" },
  founder_program_open: { kind: "boolean" },
  founder_slots_total: { kind: "number", min: 0, max: 100, suffix: "vagas" },
  support_whatsapp: { kind: "string", placeholder: "5533999999999" },
  support_email: { kind: "string", placeholder: "contato@milsaca.app" },
  whatsapp_provider: {
    kind: "select",
    options: [
      { value: "wa_me", label: "wa.me (link público)" },
      { value: "meta_cloud", label: "Meta Cloud API" },
    ],
  },
  cotacoes_provider: {
    kind: "select",
    options: [
      { value: "cepea_scrape", label: "CEPEA (scraping Notícias Agrícolas)" },
      { value: "cepea_api", label: "CEPEA (API paga)" },
    ],
  },
  region_default: {
    kind: "select",
    options: [
      { value: "MG", label: "MG" },
      { value: "ES", label: "ES" },
      { value: "SP", label: "SP" },
      { value: "BA", label: "BA" },
      { value: "PR", label: "PR" },
    ],
  },
  lead_distribution_mode: {
    kind: "select",
    options: [
      { value: "manual", label: "Manual (produtor escolhe)" },
      { value: "round_robin", label: "Rodízio entre corretoras elegíveis" },
      { value: "smart", label: "Smart (regras de distribuição aplicadas)" },
    ],
  },
  lead_max_per_corretora_solo: {
    kind: "number",
    min: 0,
    max: 9999,
    suffix: "leads/mês",
  },
  lead_max_per_corretora_pro: {
    kind: "number",
    min: 0,
    max: 9999,
    suffix: "leads/mês",
  },
  dispatch_worker_url: {
    kind: "string",
    placeholder: "https://<ref>.supabase.co/functions/v1/send-dispatch",
  },
  dispatch_worker_secret: {
    kind: "string",
    placeholder: "<bearer-secret-de-32-chars>",
  },
};

export const SETTING_LABELS: Record<SettingKey, string> = {
  trial_days: "Dias de trial automático",
  public_signup_produtor: "Cadastro público de produtor",
  public_signup_corretora: "Cadastro público de corretora",
  manual_approval_corretora: "Aprovação manual obrigatória pra corretora",
  founder_program_open: "Programa de fundadoras aberto (cadastro de corretora)",
  founder_slots_total: "Vagas de fundadora (grátis vitalício)",
  support_whatsapp: "WhatsApp oficial do suporte",
  support_email: "E-mail oficial do suporte",
  whatsapp_provider: "Provider WhatsApp",
  cotacoes_provider: "Provider de cotações",
  region_default: "UF padrão",
  lead_distribution_mode: "Modo de distribuição de leads",
  lead_max_per_corretora_solo: "Limite mensal — plano Solo",
  lead_max_per_corretora_pro: "Limite mensal — plano Pro",
  dispatch_worker_url: "URL do worker (edge function)",
  dispatch_worker_secret: "Bearer secret do worker",
};
