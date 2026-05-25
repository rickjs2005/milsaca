/**
 * Metadados puros do lead (sem deps server). Importável de client
 * components e libs client-side sem fazer o bundler arrastar
 * `@milsaca/db/web/server` pro browser.
 *
 * Funções de query (que usam supabase server-side) ficam em queries.ts
 * e dependem deste módulo.
 */

import type { Database } from "@milsaca/types/database";

export type LeadStatus = Database["public"]["Enums"]["lead_status"];

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "novo",
  "em_negociacao",
  "convertido",
  "perdido",
  "arquivado",
];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  em_negociacao: "Em negociação",
  convertido: "Convertido",
  perdido: "Perdido",
  arquivado: "Arquivado",
};

export const LEAD_STATUS_COLOR: Record<LeadStatus, string> = {
  novo: "bg-milsaca-dourado/20 text-milsaca-verde",
  em_negociacao: "bg-sky-100 text-sky-800",
  convertido: "bg-emerald-100 text-emerald-800",
  perdido: "bg-rose-100 text-rose-800",
  arquivado: "bg-slate-200 text-slate-700",
};

/**
 * Canal de origem do lead. Schema: enum `lead_origem` em `leads.origem`.
 * Hardcoded aqui pra evitar regenerar `Database` types do Supabase a cada
 * mudança de enum — quando o `supabase gen types` for re-rodado, dá pra
 * trocar por `Database["public"]["Enums"]["lead_origem"]` sem mudar a UI.
 */
export type LeadOrigem = "whatsapp" | "formulario" | "vitrine" | "manual";

export const LEAD_ORIGEM_ORDER: LeadOrigem[] = [
  "whatsapp",
  "formulario",
  "vitrine",
  "manual",
];

export const LEAD_ORIGEM_LABEL: Record<LeadOrigem, string> = {
  whatsapp: "WhatsApp",
  formulario: "Formulário público",
  vitrine: "Vitrine Milsaca",
  manual: "Cadastro manual",
};

export const LEAD_ORIGEM_COLOR: Record<LeadOrigem, string> = {
  whatsapp: "bg-[#25D366]/15 text-[#1ebe5d] ring-[#25D366]/40",
  formulario: "bg-sky-100 text-sky-800 ring-sky-200",
  vitrine: "bg-milsaca-dourado/15 text-milsaca-cafezal ring-milsaca-dourado/40",
  manual: "bg-slate-100 text-slate-700 ring-slate-200",
};

export type LeadListItem = {
  id: string;
  status: LeadStatus;
  origem: LeadOrigem | null;
  coffee_type: string | null;
  bag_count: number | null;
  proposed_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  produtor_kind: "produtor" | "contato";
  produtor_id: string;
  produtor_nome: string;
  produtor_phone: string | null;
  city: string | null;
  state: string | null;
};

export type LeadEvent = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  actor_name: string | null;
  created_at: string;
};

export type LeadDetail = LeadListItem & {
  events: LeadEvent[];
};

export type LeadTargetOption = {
  /** "produtor:<uuid>" | "contato:<uuid>" */
  value: string;
  label: string;
  kind: "produtor" | "contato";
  sublabel: string | null;
};

export type LeadListFilter = { status?: LeadStatus };
