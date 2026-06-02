/**
 * Fonte ÚNICA de rótulo do lead_status NA PERSONA PRODUTOR (web).
 *
 * Perspectiva do produtor sobre a proposta recebida da corretora — wording
 * intencionalmente diferente da corretora (não unificar). Decisão de wording:
 *
 *   novo          → "Novo"
 *   em_negociacao → "Em negociação"
 *   convertido    → "Convertido"
 *   perdido       → "Recusado"   (do ponto de vista do produtor a proposta foi recusada)
 *   arquivado     → "Arquivado"
 *
 * Sem deps server — importável de client components, server components e libs.
 * `queries.ts` re-exporta daqui e o dashboard (`produtor/page.tsx`) importa
 * daqui: zero divergência de rótulo dentro da persona produtor web.
 */

import type { Database } from "@milsaca/types/database";
import type { StatusTone } from "@/components/status-badge";

export type LeadStatus = Database["public"]["Enums"]["lead_status"];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  em_negociacao: "Em negociação",
  convertido: "Convertido",
  perdido: "Recusado",
  arquivado: "Arquivado",
};

// Tone semântico do <StatusBadge> — usado pelos cards do dashboard do produtor.
export const LEAD_STATUS_TONE: Record<LeadStatus, StatusTone> = {
  novo: "neutral",
  em_negociacao: "premium",
  convertido: "success",
  perdido: "danger",
  arquivado: "neutral",
};
