/**
 * Metadados puros do lead (sem deps server). Importável de client
 * components e libs client-side sem fazer o bundler arrastar
 * `@milsaca/db/web/server` pro browser.
 *
 * Funções de query (que usam supabase server-side) ficam em queries.ts
 * e dependem deste módulo.
 */

import type { Database } from "@milsaca/types/database";
import type { StatusTone } from "@/components/status-badge";

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

// Tone semântico (fundação D1) — usado pelo <StatusBadge> nos cards.
export const LEAD_STATUS_TONE: Record<LeadStatus, StatusTone> = {
  novo: "premium",
  em_negociacao: "info",
  convertido: "success",
  perdido: "danger",
  arquivado: "neutral",
};

// Origem do lead → tone do <StatusBadge>. WhatsApp mantém o verde da marca
// via tone success (folha); demais seguem a paleta semântica.
export const LEAD_ORIGEM_TONE: Record<LeadOrigem, StatusTone> = {
  whatsapp: "success",
  formulario: "info",
  vitrine: "premium",
  manual: "neutral",
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
  /** Contrato gerado a partir deste lead (se houver) — lead vira terminal. */
  contrato_id: string | null;
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
  /** Lote vinculado via contrato (contratos.lote_id) — pode não existir. */
  lote_id: string | null;
  lote_codigo: string | null;
};

export type LeadTargetOption = {
  /** "produtor:<uuid>" | "contato:<uuid>" */
  value: string;
  label: string;
  kind: "produtor" | "contato";
  sublabel: string | null;
};

export type LeadListFilter = { status?: LeadStatus; origem?: LeadOrigem };
